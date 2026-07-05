import { NextRequest } from 'next/server';
import { startMonitor } from '@/lib/server/monitor';
import { monitorStreamQuerySchema } from '@/types/monitor';
import type { PacketRow, MonitorEndReason } from '@/types/monitor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
	if (process.env.MONITOR_ENABLED !== 'true') {
		return new Response('Not enabled', { status: 500 });
	}

	const { searchParams } = new URL(req.url);
	const parsed = monitorStreamQuerySchema.safeParse({
		deviceIp: searchParams.get('deviceIp') ?? '',
		device: searchParams.get('device') ?? undefined
	});
	if (!parsed.success) {
		return new Response(
			JSON.stringify({ success: false, errorMessage: 'Invalid deviceIp' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } }
		);
	}
	const { deviceIp } = parsed.data;

	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			let closed = false;
			const send = (event: string, data: unknown) => {
				if (closed) return;
				try {
					controller.enqueue(
						encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
					);
				} catch {
					closed = true;
				}
			};

			// Rolling stats for `stat` events.
			let totalCount = 0;
			let totalBytes = 0;
			let lastCount = 0;
			const statTimer = setInterval(() => {
				const pps = totalCount - lastCount;
				lastCount = totalCount;
				send('stat', { count: totalCount, bytes: totalBytes, pps });
			}, 1000);

			const teardown = (reason: MonitorEndReason) => {
				if (closed) return;
				send('end', { reason });
				clearInterval(statTimer);
				closed = true;
				try {
					controller.close();
				} catch {}
			};

			await startMonitor({
				untrustedDeviceIp: deviceIp,
				signal: req.signal,
				callbacks: {
					onMeta: (meta) => send('meta', meta),
					onPacket: (row: PacketRow) => {
						totalCount++;
						totalBytes += row.len;
						send('packet', row);
					},
					onError: (message) => send('error', { message }),
					onEnd: (reason) => teardown(reason)
				}
			});
		}
	});

	return new Response(stream, {
		status: 200,
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
}

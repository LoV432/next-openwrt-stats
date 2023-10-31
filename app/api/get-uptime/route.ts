import { getUptime } from '@/lib/get-uptime';

export async function POST() {}

export async function GET() {
	let uptime = await getUptime();
	if (uptime === 'Token not found') {
		return new Response(JSON.stringify({ error: 'Token not found' }), {
			status: 400
		});
	}
	if (uptime === 'Something went wrong') {
		return new Response(JSON.stringify({ error: 'Something went wrong' }), {
			status: 400
		});
	}
	return new Response(JSON.stringify(uptime), {
		status: 200
	});
}

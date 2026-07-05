import 'server-only';
import { randomUUID } from 'crypto';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { getNetworkInterfaces } from './routerInterfaces';
import { getPrimaryRouter } from './router';
import { getDhcpDevices } from './dhcpDevices';
import { withSshExec, sshKillPidFile } from './ssh';
import { logError } from '../client/errorLog';
import type {
	PacketRow,
	MonitorEndReason,
	MonitorMetaEvent
} from '@/types/monitor';

export const MONITOR_MAX_SECONDS = Math.min(
	Number(process.env.MONITOR_MAX_SECONDS) || 300,
	300
);
export const MONITOR_MAX_PACKETS = Math.min(
	Number(process.env.MONITOR_MAX_PACKETS) || 50000,
	50000
);
const MONITOR_MAX_SESSIONS = 3;

const TSHARK_FIELDS = [
	'frame.time_epoch',
	'frame.len',
	'_ws.col.Protocol',
	'_ws.col.Info',
	'ip.src',
	'ip.dst',
	'ipv6.src',
	'ipv6.dst',
	'tcp.srcport',
	'tcp.dstport',
	'udp.srcport',
	'udp.dstport',
	'dns.qry.name',
	'tls.handshake.extensions_server_name',
	'http.host'
] as const;

// Non-root uid/gid to run tshark
const TSHARK_UID = Number(process.env.MONITOR_TSHARK_UID) || 65534;
const TSHARK_GID = Number(process.env.MONITOR_TSHARK_GID) || 65534;

function tsharkPrivilegeDropOptions() {
	if (typeof process.getuid !== 'function' || process.getuid() !== 0) {
		return {};
	}
	return {
		uid: TSHARK_UID,
		gid: TSHARK_GID,
		env: { ...process.env, HOME: '/tmp', TMPDIR: '/tmp' }
	};
}

function ipv4ToInt(ip: string): number {
	return ip.split('.').reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
}

function ipv4InCidr(ip: string, network: string, maskBits: number): boolean {
	if (maskBits <= 0) return true;
	const mask =
		maskBits >= 32 ? 0xffffffff : ~((1 << (32 - maskBits)) - 1) >>> 0;
	return (ipv4ToInt(ip) & mask) === (ipv4ToInt(network) & mask);
}

// Find the interface of the given IP address
export async function resolveInterfaceForIp(
	deviceIp: string
): Promise<
	{ success: true; iface: string } | { success: false; errorMessage: string }
> {
	const interfaces = await getNetworkInterfaces();
	if (!interfaces.success) {
		return { success: false, errorMessage: interfaces.errorMessage };
	}

	let chosenInterface: { iface: string; maskBits: number } | null = null;

	for (const iface of interfaces.data) {
		const l3 = iface.l3_device;
		for (const addr of iface['ipv4-address'] ?? []) {
			if (ipv4InCidr(deviceIp, addr.address, addr.mask)) {
				if (!chosenInterface || addr.mask > chosenInterface.maskBits) {
					chosenInterface = { iface: l3, maskBits: addr.mask };
				}
			}
		}
	}

	if (!chosenInterface?.iface) {
		return {
			success: false,
			errorMessage: 'Could not resolve a capture interface'
		};
	}
	return { success: true, iface: chosenInterface.iface };
}

/**
 * Build the fixed, self-terminating tcpdump command. `iface`, `deviceIp` and
 * `sessionId` are the only interpolations; all three are validated/generated
 * server-side, so no shell metacharacters can reach the router.
 */
export function buildCaptureCommand({
	iface,
	deviceIp,
	sessionId,
	maxPackets,
	maxSeconds
}: {
	iface: string;
	deviceIp: string;
	sessionId: string;
	maxPackets: number;
	maxSeconds: number;
}): string {
	const pidFile = `/tmp/owmon-${sessionId}.pid`;
	// We background tcpdump and use a
	// `sleep … kill` watchdog for the wall-clock cap; tcpdump's `-c` gives the
	// packet cap. The pid file holds tcpdump's PID for the kill safety net.
	const tcpdump = `tcpdump -i ${iface} -U -s0 -c ${maxPackets} -w - host ${deviceIp} and not port 22`;
	const inner =
		`${tcpdump} & CPID=$!; ` +
		`echo $CPID > ${pidFile}; ` +
		`(sleep ${maxSeconds}; kill -TERM $CPID 2>/dev/null) & WPID=$!; ` +
		`wait $CPID; kill -TERM $WPID 2>/dev/null`;
	return `sh -c '${inner}'`;
}

export function pidFileFor(sessionId: string) {
	return `/tmp/owmon-${sessionId}.pid`;
}

// --- tshark `-T ek` line parsing --------------------------------------------

function firstVal(
	layers: Record<string, unknown>,
	...keys: string[]
): string | undefined {
	for (const key of keys) {
		const v = layers[key];
		if (Array.isArray(v) && v.length > 0 && v[0] != null) return String(v[0]);
		if (typeof v === 'string' && v.length > 0) return v;
	}
	return undefined;
}

/**
 * Map a tshark `-T ek` data line (the one carrying `.layers`) to a PacketRow.
 * Returns null for the interleaved `{"index":…}` lines and unparseable rows.
 */
export function parseEkLine(line: string): PacketRow | null {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith('{"index"')) return null;
	let obj: { layers?: Record<string, unknown> };
	try {
		obj = JSON.parse(trimmed);
	} catch {
		return null;
	}
	const layers = obj.layers;
	if (!layers) return null;

	const ts = Number(firstVal(layers, 'frame_time_epoch')) || 0;
	const len = Number(firstVal(layers, 'frame_len')) || 0;
	const proto = firstVal(layers, '_ws_col_Protocol', '_ws_col_protocol') || '';
	const info = firstVal(layers, '_ws_col_Info', '_ws_col_info') || '';
	const src = firstVal(layers, 'ip_src', 'ipv6_src') || '';
	const dst = firstVal(layers, 'ip_dst', 'ipv6_dst') || '';
	const sportStr = firstVal(layers, 'tcp_srcport', 'udp_srcport');
	const dportStr = firstVal(layers, 'tcp_dstport', 'udp_dstport');
	const dns = firstVal(layers, 'dns_qry_name');
	const sni = firstVal(layers, 'tls_handshake_extensions_server_name');
	const httpHost = firstVal(layers, 'http_host');

	return {
		ts,
		len,
		proto,
		src,
		dst,
		info,
		...(sportStr ? { sport: Number(sportStr) } : {}),
		...(dportStr ? { dport: Number(dportStr) } : {}),
		...(dns ? { dns } : {}),
		...(sni ? { sni } : {}),
		...(httpHost ? { httpHost } : {}),
		uniqueId: crypto.randomUUID()
	};
}

type Session = { stop: () => void; startedAt: number; deviceIp: string };
const sessions = new Map<string, Session>();

export function activeSessionCount() {
	return sessions.size;
}

export type StartMonitorCallbacks = {
	onMeta: (meta: MonitorMetaEvent) => void;
	onPacket: (row: PacketRow) => void;
	onEnd: (reason: MonitorEndReason) => void;
	onError: (message: string) => void;
};

/**
 * Wire up an end-to-end capture: SSH-exec the wrapped tcpdump on the primary
 * router, pipe its binary pcap into a local tshark, parse the NDJSON, and emit
 * rows via callbacks. Returns a `stop()` for teardown; also self-cleans on
 * abort, tshark exit, or SSH EOF.
 */
export async function startMonitor({
	untrustedDeviceIp,
	signal,
	callbacks
}: {
	untrustedDeviceIp: string;
	signal: AbortSignal;
	callbacks: StartMonitorCallbacks;
}): Promise<{ sessionId: string }> {
	const dhcp = await getDhcpDevices();
	if (!dhcp.success) {
		callbacks.onError('Could not verify device against DHCP leases');
		callbacks.onEnd('error');
		return { sessionId: '' };
	}

	const trustedDeviceIp = dhcp.data.find(
		(d) => d.ipAddress === untrustedDeviceIp
	)?.ipAddress;
	if (!trustedDeviceIp) {
		callbacks.onError('Device IP does not match any current DHCP lease');
		callbacks.onEnd('error');
		return { sessionId: '' };
	}

	const primary = await getPrimaryRouter();
	if (!primary.success) {
		callbacks.onError('No primary router configured');
		callbacks.onEnd('error');
		return { sessionId: '' };
	}

	const resolved = await resolveInterfaceForIp(trustedDeviceIp);
	if (!resolved.success) {
		callbacks.onError(resolved.errorMessage);
		callbacks.onEnd('error');
		return { sessionId: '' };
	}

	// One active capture per device: replace any existing session for this IP.
	for (const [id, s] of sessions) {
		if (s.deviceIp === trustedDeviceIp) {
			s.stop();
			sessions.delete(id);
		}
	}
	if (sessions.size >= MONITOR_MAX_SESSIONS) {
		callbacks.onError('Too many active captures — try again shortly');
		callbacks.onEnd('error');
		return { sessionId: '' };
	}

	const sessionId = randomUUID();
	const displayName = primary.data.displayName;
	const iface = resolved.iface;
	const command = buildCaptureCommand({
		iface,
		deviceIp: trustedDeviceIp,
		sessionId,
		maxPackets: MONITOR_MAX_PACKETS,
		maxSeconds: MONITOR_MAX_SECONDS
	});

	const startedAt = Date.now();
	let packetCount = 0;
	let stopped = false;

	// Local tshark: read the live pcap stream from stdin (`-i -`).
	const tshark: ChildProcessWithoutNullStreams = spawn(
		'tshark',
		['-i', '-', '-l', '-T', 'ek', ...TSHARK_FIELDS.flatMap((f) => ['-e', f])],
		{ stdio: ['pipe', 'pipe', 'pipe'], ...tsharkPrivilegeDropOptions() }
	);

	let sshHandle: Awaited<ReturnType<typeof withSshExec>> | null = null;

	const finish = (reason: MonitorEndReason) => {
		if (stopped) return;
		stopped = true;
		sessions.delete(sessionId);
		try {
			sshHandle?.stop();
		} catch {}
		try {
			tshark.kill('SIGTERM');
		} catch {}
		// Safety net: kill any lingering tcpdump on the router.
		sshKillPidFile({ displayName, pidFile: pidFileFor(sessionId) });
		callbacks.onEnd(reason);
	};

	const stop = () => finish('closed');
	sessions.set(sessionId, { stop, startedAt, deviceIp: trustedDeviceIp });

	if (signal.aborted) {
		stop();
		return { sessionId };
	}
	signal.addEventListener('abort', stop, { once: true });

	// Parse tshark stdout line-by-line.
	let buf = '';
	tshark.stdout.on('data', (chunk: Buffer) => {
		buf += chunk.toString('utf8');
		let nl: number;
		while ((nl = buf.indexOf('\n')) !== -1) {
			const line = buf.slice(0, nl);
			buf = buf.slice(nl + 1);
			const row = parseEkLine(line);
			if (row) {
				packetCount++;
				callbacks.onPacket(row);
			}
		}
	});

	tshark.stderr.on('data', (chunk: Buffer) => {
		const msg = chunk.toString('utf8').trim();
		// tshark writes a benign "Capturing on ..." banner to stderr.
		if (msg && !/^Capturing on/i.test(msg)) {
			logError({ displayName, errorMessage: 'tshark stderr', detail: msg });
		}
	});

	tshark.on('error', (err) => {
		callbacks.onError(`tshark failed to start: ${err.message}`);
		finish('error');
	});

	tshark.on('close', () => {
		// tshark exiting means the pipeline drained — decide the reason.
		const elapsed = (Date.now() - startedAt) / 1000;
		const reason: MonitorEndReason =
			packetCount >= MONITOR_MAX_PACKETS
				? 'maxPackets'
				: elapsed >= MONITOR_MAX_SECONDS - 1
					? 'timeout'
					: 'router-eof';
		finish(reason);
	});

	// Kick off the SSH capture and pipe its stdout into tshark.
	try {
		sshHandle = await withSshExec({
			displayName,
			command,
			onStdout: (chunk) => {
				if (!tshark.stdin.destroyed) tshark.stdin.write(chunk);
			},
			onStderr: (chunk) => {
				// tcpdump's own diagnostics on the router (bad iface, not installed,
				// filter syntax, permission). Surface them
				const msg = chunk.toString('utf8').trim();
				if (!msg) return;
				logError({
					displayName,
					errorMessage: 'router tcpdump stderr',
					iface,
					command,
					detail: msg
				});
				// tcpdump prints a benign startup banner to stderr; only forward
				// lines that look like real errors to the client.
				if (!/^(tcpdump: )?(listening|verbose output)/i.test(msg)) {
					callbacks.onError(`Router capture error: ${msg}`);
				}
			},
			onClose: () => {
				// Router side ended (timeout/-c/EOF): close tshark stdin so it flushes.
				try {
					tshark.stdin.end();
				} catch {}
			},
			signal
		});
	} catch (error) {
		logError({
			displayName,
			errorMessage: 'startMonitor SSH exec failed',
			error
		});
		callbacks.onError('Failed to start capture on the router');
		finish('error');
		return { sessionId };
	}

	callbacks.onMeta({ sessionId, iface, deviceIp: trustedDeviceIp });
	return { sessionId };
}

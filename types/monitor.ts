import { z } from 'zod';

/**
 * A single dissected packet, mapped from a tshark `-T ek` data line.
 * This is the shape streamed to the browser as SSE `packet` events.
 */
export type PacketRow = {
	ts: number; // frame.time_epoch (seconds, float)
	len: number; // frame.len
	proto: string; // _ws.col.Protocol
	src: string; // ip.src / ipv6.src
	dst: string; // ip.dst / ipv6.dst
	sport?: number; // tcp.srcport / udp.srcport
	dport?: number; // tcp.dstport / udp.dstport
	info: string; // _ws.col.Info
	dns?: string; // dns.qry.name
	sni?: string; // tls.handshake.extensions_server_name
	httpHost?: string; // http.host
	uniqueId: string; // random UUID
};

/**
 * SSE event payloads emitted by /api/monitor/stream.
 */
export type MonitorMetaEvent = {
	sessionId: string;
	iface: string;
	deviceIp: string;
};

export type MonitorStatEvent = {
	count: number;
	bytes: number;
	pps: number;
};

export type MonitorEndReason =
	'timeout' | 'maxPackets' | 'closed' | 'router-eof' | 'error';

export type MonitorEndEvent = {
	reason: MonitorEndReason;
};

/**
 * Query params accepted by the stream route.
 * `deviceIp` is validated against a live DHCP lease server-side.
 */
export const monitorStreamQuerySchema = z.object({
	deviceIp: z.ipv4().or(z.ipv6()),
	device: z.string().optional()
});

export type MonitorStreamQuery = z.infer<typeof monitorStreamQuerySchema>;

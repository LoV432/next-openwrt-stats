'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { List, RowComponentProps } from 'react-window';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Activity, Loader2, Play, Radio, Square } from 'lucide-react';
import { toast } from 'sonner';
import { formatBytes } from '@/lib/utils';
import { useEventSource } from '@/hooks/useEventSource';
import type {
	PacketRow,
	MonitorMetaEvent,
	MonitorStatEvent,
	MonitorEndEvent
} from '@/types/monitor';

const MAX_ROWS = 10000;
const ROW_HEIGHT = 30;

function endpoint(ip: string, port?: number) {
	if (!ip) return '—';
	return port ? `${ip}:${port}` : ip;
}

function PacketRowItem({
	index,
	style,
	packets,
	selected,
	onSelect
}: RowComponentProps<{
	packets: PacketRow[];
	selected: string | null;
	onSelect: (i: string) => void;
}>) {
	const p = packets[index];
	const isSelected = selected === p.uniqueId;
	return (
		<div
			style={style}
			onClick={() => onSelect(p.uniqueId)}
			className={`flex cursor-pointer items-center gap-2 border-b border-neutral-800/60 px-2 font-mono text-xs ${
				isSelected ? 'bg-neutral-800' : 'hover:bg-neutral-900'
			}`}
		>
			<span className="w-20 shrink-0 text-neutral-500">
				{new Date(p.ts * 1000).toLocaleTimeString()}
			</span>
			<span className="w-16 shrink-0 truncate font-semibold text-sky-300">
				{p.proto}
			</span>
			<span className="flex-1 truncate text-neutral-300">
				{endpoint(p.src, p.sport)} <span className="text-neutral-600">→</span>{' '}
				{endpoint(p.dst, p.dport)}
			</span>
			<span className="w-12 shrink-0 text-right text-neutral-500">{p.len}</span>
			<span className="hidden flex-1 truncate text-neutral-400 sm:block">
				{p.sni || p.dns || p.httpHost || p.info}
			</span>
		</div>
	);
}

function StatTile({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5">
			<div className="text-[10px] uppercase tracking-wide text-neutral-500">
				{label}
			</div>
			<div className="font-mono text-sm text-neutral-100">{value}</div>
		</div>
	);
}

type PanelRow = { key: string; label: string; value: string };

function SidePanel({
	title,
	empty,
	rows
}: {
	title: string;
	empty: string;
	rows: PanelRow[];
}) {
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-neutral-800 bg-neutral-950">
			<div className="flex items-center justify-between border-b border-neutral-800 px-2 py-1 text-[10px] uppercase tracking-wide text-neutral-500">
				<span>{title}</span>
				{rows.length > 0 && (
					<span className="text-neutral-600">{rows.length}</span>
				)}
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto">
				{rows.length ? (
					rows.map((r) => (
						<div
							key={r.key}
							className="flex items-center gap-2 border-b border-neutral-900 px-2 py-1 text-xs"
						>
							<span
								className="flex-1 truncate font-mono text-neutral-300"
								title={r.label}
							>
								{r.label}
							</span>
							<span className="shrink-0 font-mono text-neutral-500">
								{r.value}
							</span>
						</div>
					))
				) : (
					<div className="px-2 py-2 text-xs text-neutral-600">{empty}</div>
				)}
			</div>
		</div>
	);
}

export function DeviceMonitorDialog({
	deviceIp,
	deviceName
}: {
	deviceIp: string;
	deviceName: string;
}) {
	const [open, setOpen] = useState(false);
	const [stopped, setStopped] = useState(false);
	const [packets, setPackets] = useState<PacketRow[]>([]);
	const [meta, setMeta] = useState<MonitorMetaEvent | null>(null);
	const [stat, setStat] = useState<MonitorStatEvent>({
		count: 0,
		bytes: 0,
		pps: 0
	});
	const [selected, setSelected] = useState<string | null>(null);
	const [elapsed, setElapsed] = useState(0);

	// Buffer packets in a ref and flush on an interval so a high packet rate
	// doesn't trigger a React render per packet.
	const bufferRef = useRef<PacketRow[]>([]);
	const startedAtRef = useRef<number | null>(null);

	const reset = useCallback(() => {
		bufferRef.current = [];
		setPackets([]);
		setMeta(null);
		setStat({ count: 0, bytes: 0, pps: 0 });
		setSelected(null);
		setElapsed(0);
		setStopped(false);
		startedAtRef.current = null;
	}, []);

	const handleEvent = useCallback((event: string, data: unknown) => {
		switch (event) {
			case 'meta':
				setMeta(data as MonitorMetaEvent);
				startedAtRef.current = Date.now();
				break;
			case 'packet':
				// newest first
				bufferRef.current.unshift(data as PacketRow);
				if (bufferRef.current.length > MAX_ROWS) {
					bufferRef.current.length = MAX_ROWS;
				}
				break;
			case 'stat':
				setStat(data as MonitorStatEvent);
				break;
			case 'error':
				toast.error((data as { message?: string })?.message || 'Capture error');
				break;
			case 'end': {
				const reason = (data as MonitorEndEvent)?.reason;
				setStopped(true);
				if (reason === 'maxPackets')
					toast.info('Capture stopped: packet limit reached');
				else if (reason === 'timeout')
					toast.info('Capture stopped: time limit reached');
				else if (reason === 'router-eof')
					toast.info('Capture ended on the router');
				break;
			}
		}
	}, []);

	const { status } = useEventSource({
		url: `/api/monitor/stream?deviceIp=${encodeURIComponent(deviceIp)}`,
		enabled: open && !stopped,
		onEvent: handleEvent
	});

	useEffect(() => {
		if (!open) return;
		const id = setInterval(() => {
			setPackets([...bufferRef.current]);
			if (startedAtRef.current) {
				setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
			}
		}, 50);
		return () => clearInterval(id);
	}, [open, packets.length]);

	useEffect(() => {
		if (open) reset();
	}, [open, reset]);

	const selectedPacket = useMemo(() => {
		if (!selected) return undefined;
		return packets.find((p) => p.uniqueId === selected);
	}, [selected]);

	const panels = useMemo(() => {
		const dns = new Map<string, number>();
		const sni = new Map<string, number>();
		const talkers = new Map<string, { bytes: number; packets: number }>();

		for (const p of packets) {
			if (p.dns) dns.set(p.dns, (dns.get(p.dns) ?? 0) + 1);
			if (p.sni) sni.set(p.sni, (sni.get(p.sni) ?? 0) + 1);
			const peer =
				p.src === deviceIp
					? p.dst
					: p.dst === deviceIp
						? p.src
						: p.dst || p.src;
			if (peer) {
				const cur = talkers.get(peer) ?? { bytes: 0, packets: 0 };
				cur.bytes += p.len;
				cur.packets += 1;
				talkers.set(peer, cur);
			}
		}

		const topCounts = (m: Map<string, number>): PanelRow[] =>
			[...m.entries()]
				.sort((a, b) => b[1] - a[1])
				.slice(0, 50)
				.map(([label, count]) => ({
					key: label,
					label,
					value: String(count)
				}));

		const topTalkers: PanelRow[] = [...talkers.entries()]
			.sort((a, b) => b[1].bytes - a[1].bytes)
			.slice(0, 50)
			.map(([peer, v]) => ({
				key: peer,
				label: peer,
				value: formatBytes(v.bytes)
			}));

		return { dns: topCounts(dns), sni: topCounts(sni), talkers: topTalkers };
	}, [packets, deviceIp]);

	const connecting = status === 'connecting' && !meta;

	const elapsedStr = useMemo(() => {
		const m = Math.floor(elapsed / 60);
		const s = elapsed % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}, [elapsed]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" title="Monitor traffic">
					<Activity className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-300 flex h-[95dvh] w-[90vw] flex-col border-neutral-800 bg-neutral-900 px-2 sm:px-6">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-white">
						<Radio
							className={`h-4 w-4 ${
								!stopped && meta
									? 'animate-pulse text-emerald-400'
									: 'text-neutral-500'
							}`}
						/>
						{deviceName || deviceIp} — Live Traffic
					</DialogTitle>
				</DialogHeader>

				<div className="flex flex-wrap items-center gap-2">
					<StatTile label="Packets" value={String(stat.count)} />
					<StatTile label="Bytes" value={formatBytes(stat.bytes)} />
					<StatTile label="pps" value={String(stat.pps)} />
					<StatTile label="Elapsed" value={elapsedStr} />
					{meta && <StatTile label="Interface" value={meta.iface} />}
					<div className="ml-auto">
						{stopped ? (
							<Button size="sm" variant="outline" onClick={reset}>
								<Play className="h-3.5 w-3.5" />
								Restart
							</Button>
						) : (
							<Button
								size="sm"
								variant="outline"
								disabled={!meta}
								onClick={() => setStopped(true)}
							>
								<Square className="h-3.5 w-3.5" />
								Stop
							</Button>
						)}
					</div>
				</div>

				<div className="flex min-h-0 flex-1 gap-2">
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-neutral-800 bg-black">
						<div className="flex items-center gap-2 border-b border-neutral-800 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-neutral-500">
							<span className="w-20 shrink-0">Time</span>
							<span className="w-16 shrink-0">Proto</span>
							<span className="flex-1">Source → Destination</span>
							<span className="w-12 shrink-0 text-right">Len</span>
							<span className="hidden flex-1 sm:block">Info</span>
						</div>
						<div className="min-h-0 flex-1">
							{packets.length ? (
								<List
									className="h-full"
									rowCount={packets.length}
									rowHeight={ROW_HEIGHT}
									overscanCount={15}
									rowProps={{ packets, selected, onSelect: setSelected }}
									rowComponent={PacketRowItem}
								/>
							) : (
								<div className="flex h-full items-center justify-center gap-2 text-sm text-neutral-500">
									{connecting ? (
										<>
											<Loader2 className="h-4 w-4 animate-spin" />
											Starting capture…
										</>
									) : stopped ? (
										'Capture stopped.'
									) : (
										'Waiting for packets…'
									)}
								</div>
							)}
						</div>
					</div>
					<div className="hidden w-72 shrink-0 flex-col gap-2 lg:flex">
						<SidePanel
							title="TLS SNI"
							empty="No TLS SNI seen yet"
							rows={panels.sni}
						/>
						<SidePanel
							title="DNS Queries"
							empty="No DNS queries seen yet"
							rows={panels.dns}
						/>
						<SidePanel
							title="Top Talkers"
							empty="No traffic yet"
							rows={panels.talkers}
						/>
					</div>
				</div>

				{selectedPacket && (
					<div className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs text-neutral-300">
						<div className="mb-1 text-neutral-500">
							{new Date(selectedPacket.ts * 1000).toLocaleString()} ·{' '}
							{selectedPacket.proto} · {selectedPacket.len} bytes
						</div>
						<div>
							{endpoint(selectedPacket.src, selectedPacket.sport)} →{' '}
							{endpoint(selectedPacket.dst, selectedPacket.dport)}
						</div>
						{selectedPacket.sni && <div>TLS SNI: {selectedPacket.sni}</div>}
						{selectedPacket.dns && <div>DNS: {selectedPacket.dns}</div>}
						{selectedPacket.httpHost && (
							<div>HTTP Host: {selectedPacket.httpHost}</div>
						)}
						{selectedPacket.info && (
							<div className="text-neutral-400">{selectedPacket.info}</div>
						)}
					</div>
				)}

				<p className="text-[11px] text-neutral-600">
					Showing newest {packets.length.toLocaleString()} of up to{' '}
					{MAX_ROWS.toLocaleString()} packets. With software flow-offloading
					enabled, long-lived flows may appear truncated.
				</p>
			</DialogContent>
		</Dialog>
	);
}

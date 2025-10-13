'use client';

import { Fragment, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, History, Router, Wifi, Gauge } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Separator } from './ui/separator';
import { PresenceEvent } from '@/app/api/presence/[mac]/route';
import { formatBand } from '@/lib/utils';

type PresenceEventQueryResult =
	| {
			success: true;
			data: PresenceEvent[];
	  }
	| {
			success: false;
			error: string;
	  };

function eventStyles(evt: PresenceEvent['event']) {
	switch (evt) {
		case 'client-connected':
			return {
				dot: 'bg-emerald-400/40',
				text: 'text-emerald-200',
				label: 'Connected'
			};
		case 'client-updated':
			return {
				dot: 'bg-sky-400/40',
				text: 'text-sky-200',
				label: 'Updated'
			};
		case 'client-disconnected':
			return {
				dot: 'bg-rose-400/40',
				text: 'text-rose-200',
				label: 'Disconnected'
			};
		default:
			return {
				dot: 'bg-neutral-500/40',
				text: 'text-neutral-300',
				label: 'Event'
			};
	}
}

function ChipForEvent({ evt }: { evt: PresenceEvent }) {
	return (
		<li className="mx-auto w-fit space-y-2 rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm">
			<div className="mx-auto flex gap-2 text-sm text-neutral-500">
				<div className="flex w-full items-center justify-center gap-2">
					<span
						className={`mt-0.5 h-2.5 w-2.5 rounded-full ${eventStyles(evt.event).dot}`}
					/>
					<span>{new Date(evt.timestamp).toLocaleString()}</span>
				</div>
			</div>
			{evt.event !== 'client-disconnected' && (
				<div className="grid items-center justify-between space-y-1 font-semibold">
					<div className="flex items-center gap-1.5">
						<Router
							className={`mb-1 h-4 w-4 ${evt.fromRouter && evt.fromRouter !== evt.toRouter ? 'text-orange-400' : 'text-neutral-500'}`}
						/>
						<span>{evt.toRouter}</span>
					</div>{' '}
					<div className="flex items-center gap-1.5">
						<Wifi
							className={`h-4 w-4 ${evt.fromSSID && evt.fromSSID !== evt.toSSID ? 'text-orange-400' : 'text-neutral-500'}`}
						/>
						<span>{evt.toSSID}</span>
					</div>
					<div className="flex items-center gap-1.5">
						<Gauge
							className={`h-4 w-4 ${evt.fromBand && evt.fromBand !== evt.toBand ? 'text-orange-400' : 'text-neutral-500'}`}
						/>
						<span>{formatBand(evt.toBand || '')}</span>
					</div>
				</div>
			)}
		</li>
	);
}

export function PresenceHistoryDialog({
	clientMac,
	clientName
}: {
	clientMac: string;
	clientName: string;
}) {
	const [open, setOpen] = useState(false);
	const { data, isLoading, error } = useQuery({
		queryKey: ['getClientPresence', clientMac],
		queryFn: async () => {
			const response = await fetch(
				`/api/presence/${encodeURIComponent(clientMac)}`
			);
			const data = (await response.json()) as PresenceEventQueryResult;
			if (!data.success) {
				throw new Error(data.error);
			}
			return data.data;
		},
		enabled: open
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<History className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[80vh] max-w-3xl border-neutral-800 bg-neutral-900 px-3 sm:px-4">
				<DialogHeader>
					<DialogTitle className="text-white">
						{clientName || clientMac} — Presence History
					</DialogTitle>
				</DialogHeader>

				{isLoading && (
					<div className="flex items-center gap-2 text-neutral-400">
						<Loader2 className="h-4 w-4 animate-spin" />
						Loading history…
					</div>
				)}

				{error && (
					<div className="text-sm text-rose-300">Failed to load history.</div>
				)}

				{!isLoading && !error && (
					<div className="h-full w-full overflow-auto rounded-md border border-neutral-800 bg-black bg-[radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:16px_16px]">
						<ul className="mx-auto w-full max-w-sm py-4">
							{data?.length ? (
								data.map((evt) => {
									return (
										<Fragment key={evt.id}>
											<Separator
												orientation="vertical"
												className="mx-auto my-1 min-h-6 first:hidden last:hidden"
											/>
											<ChipForEvent evt={evt} />
										</Fragment>
									);
								})
							) : (
								<li className="p-3 text-sm text-neutral-400">
									No events recorded.
								</li>
							)}
						</ul>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

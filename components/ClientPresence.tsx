'use client';

import { useState, useCallback } from 'react';
import { List, RowComponentProps } from 'react-window';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, History, Router, Wifi, Gauge } from 'lucide-react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Separator } from './ui/separator';
import { PresenceEvent } from '@/app/api/presence/[mac]/route';
import { formatBand } from '@/lib/utils';
import { eventTypeIdMap } from '@/drizzle/schema/schema';

type PresenceEventQueryResult =
	| {
			success: true;
			data: PresenceEvent[];
			hasMore: boolean;
			nextCursor: string | null;
	  }
	| {
			success: false;
			error: string;
	  };

function eventStyles(evt: PresenceEvent['eventType']) {
	switch (evt) {
		case eventTypeIdMap.client_connected:
			return {
				dot: 'bg-emerald-400/40',
				text: 'text-emerald-200',
				label: 'Connected'
			};
		case eventTypeIdMap.client_updated:
			return {
				dot: 'bg-sky-400/40',
				text: 'text-sky-200',
				label: 'Updated'
			};
		case eventTypeIdMap.client_disconnected:
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
		<div className="mx-auto w-fit space-y-2 rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm">
			<div className="mx-auto flex gap-2 text-sm text-neutral-500">
				<div className="flex w-full items-center justify-center gap-2">
					<span
						className={`mt-0.5 h-2.5 w-2.5 rounded-full ${eventStyles(evt.eventType).dot}`}
					/>
					<span>{new Date(evt.timestamp).toLocaleString()}</span>
				</div>
			</div>
			{evt.eventType !== eventTypeIdMap.client_disconnected && (
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
		</div>
	);
}

function PresenceEventRow({
	index,
	style,
	events
}: RowComponentProps<{
	events: PresenceEvent[];
}>) {
	const evt = events[index];
	const isFirst = index === 0;

	return (
		<div style={style} className="p-3">
			<div className="flex flex-col items-center">
				{!isFirst && (
					<Separator orientation="vertical" className="mx-auto min-h-6" />
				)}
				<ChipForEvent evt={evt} />
			</div>
		</div>
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

	const {
		data,
		isLoading,
		error,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage
	} = useInfiniteQuery<PresenceEventQueryResult>({
		queryKey: ['getClientPresence', clientMac],
		queryFn: async ({ pageParam }) => {
			const url = pageParam
				? `/api/presence/${encodeURIComponent(clientMac)}?cursor=${encodeURIComponent(pageParam as string)}`
				: `/api/presence/${encodeURIComponent(clientMac)}`;
			const response = await fetch(url);
			const result = (await response.json()) as PresenceEventQueryResult;
			if (!result.success) {
				throw new Error(result.error);
			}
			return result;
		},
		getNextPageParam: (lastPage) =>
			lastPage.success ? lastPage.nextCursor : null,
		enabled: open,
		initialPageParam: null
	});

	const allEvents =
		data?.pages.flatMap((page) => (page.success ? page.data : [])) || [];

	const handleScroll = useCallback(
		(e: React.UIEvent<HTMLDivElement>) => {
			if (!hasNextPage || isFetchingNextPage) return;

			const target = e.target as HTMLElement;
			const { scrollTop, scrollHeight, clientHeight } = target;
			const threshold = 100;

			if (scrollHeight - scrollTop - clientHeight < threshold) {
				fetchNextPage();
			}
		},
		[hasNextPage, isFetchingNextPage, fetchNextPage]
	);

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
					<div className="h-full max-h-[calc(80vh-100px)] min-h-36 w-full overflow-auto rounded-md border border-neutral-800 bg-black bg-[radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:16px_16px]">
						{allEvents.length ? (
							<>
								<List
									className="h-full"
									rowCount={allEvents.length}
									overscanCount={10}
									rowHeight={(index) =>
										(allEvents[index].eventType ===
										eventTypeIdMap.client_disconnected
											? 63
											: 138) -
										(index === 0
											? 24
											: index === allEvents.length - 1 && allEvents.length > 1
												? -30
												: 0)
									}
									rowProps={{
										events: allEvents
									}}
									rowComponent={PresenceEventRow}
									onScroll={handleScroll}
								/>
								{isFetchingNextPage && (
									<div className="flex items-center justify-center gap-2 p-4 text-neutral-400">
										<Loader2 className="h-4 w-4 animate-spin" />
										Loading more…
									</div>
								)}
							</>
						) : (
							<div className="flex h-full items-center justify-center p-3 text-center text-sm text-neutral-400">
								No events recorded.
							</div>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

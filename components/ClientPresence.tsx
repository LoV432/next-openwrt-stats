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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover';
import { Loader2, History, Router, Wifi, Gauge, Filter } from 'lucide-react';
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
			errorMessage: string;
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
	const [filters, setFilters] = useState<{
		eventType?: number[];
		startTime?: string;
		endTime?: string;
	}>({ eventType: [1, 2, 3] });

	function buildQueryUrl(pageParam: string | null) {
		const params = new URLSearchParams();
		if (pageParam) params.set('cursor', pageParam);
		if (filters.eventType) params.set('eventType', filters.eventType.join(','));
		if (filters.startTime) params.set('startTime', filters.startTime);
		if (filters.endTime) params.set('endTime', filters.endTime);

		const queryString = params.toString();
		return `/api/presence/${encodeURIComponent(clientMac)}${queryString ? `?${queryString}` : ''}`;
	}

	const {
		data,
		isLoading,
		error,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		refetch
	} = useInfiniteQuery<PresenceEventQueryResult>({
		queryKey: ['getClientPresence', clientMac, filters],
		queryFn: async ({ pageParam }) => {
			const url = buildQueryUrl(pageParam as string | null);
			const response = await fetch(url);
			const result = (await response.json()) as PresenceEventQueryResult;
			if (!result.success) {
				throw new Error(result.errorMessage);
			}
			return result;
		},
		getNextPageParam: (lastPage) =>
			lastPage.success ? lastPage.nextCursor : null,
		enabled: open,
		initialPageParam: null
	});

	const handleFilterChange = (key: string, value: string | number[]) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

	const handleEventTypeChange = (eventType: number, checked: boolean) => {
		setFilters((prev) => {
			const currentEventTypes = prev.eventType || [];
			if (checked) {
				return { ...prev, eventType: [...currentEventTypes, eventType] };
			} else {
				return {
					...prev,
					eventType: currentEventTypes.filter((type) => type !== eventType)
				};
			}
		});
	};

	function clearFilters() {
		setFilters({
			eventType: [1, 2, 3]
		});
	}

	function applyFilters() {
		refetch();
	}

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
			<DialogContent className="h-[80vh] max-w-3xl border-neutral-800 bg-neutral-900 px-3 sm:px-4">
				<DialogHeader>
					<DialogTitle className="text-white">
						{clientName || clientMac} — Presence History
					</DialogTitle>
				</DialogHeader>
				<div
					className={`relative h-[calc(90vh-200px)] w-full overflow-auto rounded-md border border-neutral-800 bg-black bg-[radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:16px_16px] ${isLoading || error || allEvents.length === 0 ? 'flex items-center justify-center' : ''}`}
				>
					<Popover>
						<PopoverTrigger asChild>
							<Button
								size="sm"
								className="absolute right-5 top-3 z-20 border-neutral-800 bg-neutral-900 text-white hover:bg-neutral-800"
							>
								<Filter className="h-4 w-4 text-neutral-400" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-fit">
							<div className="space-y-4">
								<div className="space-y-2">
									<Label className="text-xs text-neutral-400">Event Type</Label>
									<div className="space-y-2">
										<div className="flex items-center space-x-2">
											<Checkbox
												id="connected"
												checked={
													filters.eventType?.includes(
														eventTypeIdMap.client_connected
													) || false
												}
												onCheckedChange={(checked) =>
													handleEventTypeChange(
														eventTypeIdMap.client_connected,
														checked as boolean
													)
												}
											/>
											<Label
												htmlFor="connected"
												className="w-full text-sm text-neutral-200"
											>
												Connected
											</Label>
										</div>
										<div className="flex items-center space-x-2">
											<Checkbox
												id="updated"
												checked={
													filters.eventType?.includes(
														eventTypeIdMap.client_updated
													) || false
												}
												onCheckedChange={(checked) =>
													handleEventTypeChange(
														eventTypeIdMap.client_updated,
														checked as boolean
													)
												}
											/>
											<Label
												htmlFor="updated"
												className="w-full text-sm text-neutral-200"
											>
												Updated
											</Label>
										</div>
										<div className="flex items-center space-x-2">
											<Checkbox
												id="disconnected"
												checked={
													filters.eventType?.includes(
														eventTypeIdMap.client_disconnected
													) || false
												}
												onCheckedChange={(checked) =>
													handleEventTypeChange(
														eventTypeIdMap.client_disconnected,
														checked as boolean
													)
												}
											/>
											<Label
												htmlFor="disconnected"
												className="w-full text-sm text-neutral-200"
											>
												Disconnected
											</Label>
										</div>
									</div>
								</div>

								<div className="space-y-2">
									<Label
										htmlFor="start-time"
										className="text-xs text-neutral-400"
									>
										Start Date
									</Label>
									<Input
										id="start-time"
										type={'date'}
										value={
											filters.startTime
												? new Date(Number(filters.startTime))
														.toISOString()
														.split('T')[0]
												: ''
										}
										onChange={(e) => {
											const date =
												e.target.valueAsDate?.getTime().toString() || '';
											handleFilterChange('startTime', date);
										}}
										className="h-8 border-neutral-700 bg-neutral-800 text-neutral-200"
									/>
								</div>

								<div className="space-y-2">
									<Label
										htmlFor="end-time"
										className="text-xs text-neutral-400"
									>
										End Date
									</Label>
									<Input
										id="end-time"
										type={'date'}
										value={
											filters.endTime
												? new Date(Number(filters.endTime))
														.toISOString()
														.split('T')[0]
												: ''
										}
										onChange={(e) => {
											const date =
												e.target.valueAsDate
													?.setHours(23, 59, 59, 999)
													.toString() || '';
											handleFilterChange('endTime', date);
										}}
										className="h-8 border-neutral-700 bg-neutral-800 text-neutral-200"
									/>
								</div>

								<div className="flex gap-2 pt-2">
									<Button
										onClick={applyFilters}
										className="h-8 w-24"
										size={'sm'}
									>
										Apply
									</Button>
									<Button
										onClick={clearFilters}
										size={'sm'}
										variant="outline"
										className="h-8 w-24"
									>
										Clear
									</Button>
								</div>
							</div>
						</PopoverContent>
					</Popover>
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
					) : isLoading ? (
						<div className="flex items-center justify-center gap-2">
							<Loader2 className="mt-1 h-4 w-4 animate-spin" />
							Loading history…
						</div>
					) : error ? (
						<>Failed to load history.</>
					) : (
						<>No events recorded.</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

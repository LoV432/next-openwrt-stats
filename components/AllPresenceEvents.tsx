'use client';

import { useState, useCallback, useEffect } from 'react';
import { List, RowComponentProps } from 'react-window';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
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
import { Loader2, History, Filter } from 'lucide-react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Client } from '@/app/api/clients/route';
import { formatBand } from '@/lib/utils';
import { eventTypeIdMap } from '@/drizzle/schema/schema';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { PresenceEvent } from '@/app/api/presence/[mac]/route';

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

function getEventLevelStyle(eventType: PresenceEvent['eventType']) {
	switch (eventType) {
		case eventTypeIdMap.client_connected:
			return 'text-green-400 bg-green-950 border-green-800';
		case eventTypeIdMap.client_updated:
			return 'text-blue-400 bg-blue-950 border-blue-800';
		case eventTypeIdMap.client_disconnected:
			return 'text-red-400 bg-red-950 border-red-800';
		default:
			return 'text-neutral-400 bg-neutral-950 border-neutral-800';
	}
}

function getEventLabel(eventType: PresenceEvent['eventType']) {
	switch (eventType) {
		case eventTypeIdMap.client_connected:
			return 'CONNECTED';
		case eventTypeIdMap.client_updated:
			return 'UPDATED';
		case eventTypeIdMap.client_disconnected:
			return 'DISCONNECTED';
		default:
			return 'UNKNOWN';
	}
}

function formatEventMessage(evt: PresenceEvent): string {
	const deviceInfo = `${evt.clientName} (${evt.clientMac})`;

	if (evt.eventType === eventTypeIdMap.client_disconnected) {
		return `${deviceInfo} disconnected`;
	}

	const networkInfo = [];
	if (evt.toRouter) networkInfo.push(`Router: ${evt.toRouter}`);
	if (evt.toSSID) networkInfo.push(`SSID: ${evt.toSSID}`);
	if (evt.toBand) networkInfo.push(`Band: ${formatBand(evt.toBand)}`);

	const action =
		evt.eventType === eventTypeIdMap.client_connected ? 'connected' : 'updated';
	return `${deviceInfo} ${action}${networkInfo.length > 0 ? ` to -- ${networkInfo.join(', ')}` : ''}`;
}

function PresenceEventLog({
	index,
	events,
	style
}: RowComponentProps<{
	events: PresenceEvent[];
}>) {
	const event = events[events.length - index - 1];

	return (
		<div
			key={event.id}
			className="flex items-start gap-3 p-2 transition-colors hover:bg-neutral-900"
			style={style}
		>
			<div
				className={`font-mono text-xs ${getEventLevelStyle(event.eventType)} my-auto h-4 w-4 rounded-full`}
			></div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2 text-xs text-neutral-500">
					<span className="font-mono">
						{new Date(event.timestamp).toLocaleString()}
					</span>
					<span>•</span>
					<span>{getEventLabel(event.eventType)}</span>
				</div>
				<p className="mt-1 whitespace-nowrap font-mono text-sm text-white">
					{formatEventMessage(event)}
				</p>
			</div>
		</div>
	);
}

export function AllPresenceEventsDialog({
	dialogState
}: {
	dialogState: {
		isOpen: boolean;
		setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
	};
}) {
	const [filters, setFilters] = useState<{
		eventType?: number[];
		clientMac?: string;
		startTime?: string;
		endTime?: string;
	}>({ eventType: [1, 2, 3] });

	const { data: clientsData } = useQuery({
		queryKey: ['getClients'],
		queryFn: async () => {
			const response = await fetch('/api/clients');
			const result = await response.json();
			if (!result.success) {
				throw new Error(result.errorMessage || 'Failed to fetch clients');
			}
			return result.data as Client[];
		},
		enabled: dialogState.isOpen,
		refetchOnWindowFocus: false
	});

	function buildQueryUrl(pageParam: string | null) {
		const params = new URLSearchParams();
		if (pageParam) params.set('cursor', pageParam);
		if (filters.eventType) params.set('eventType', filters.eventType.join(','));
		if (filters.clientMac)
			params.set(
				'clientMac',
				filters.clientMac === 'all' ? '' : filters.clientMac
			);
		if (filters.startTime) params.set('startTime', filters.startTime);
		if (filters.endTime) params.set('endTime', filters.endTime);

		const queryString = params.toString();
		return `/api/presence/all${queryString ? `?${queryString}` : ''}`;
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
		queryKey: ['getAllPresenceEvents', filters],
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
		enabled: dialogState.isOpen,
		initialPageParam: null
	});

	function handleFilterChange(key: string, value: string | number[]) {
		setFilters((prev) => ({ ...prev, [key]: value }));
	}

	function handleEventTypeChange(eventType: number, checked: boolean) {
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
	}

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

	useEffect(() => {
		if (dialogState.isOpen === false) {
			clearFilters();
		}
	}, [dialogState.isOpen]);

	return (
		<Dialog open={dialogState.isOpen} onOpenChange={dialogState.setIsOpen}>
			<DialogContent className="sm:max-w-300 h-[95dvh] w-[90vw] border-neutral-800 bg-neutral-900 px-2 sm:px-6">
				<DialogHeader className="px-4 sm:px-0">
					<DialogTitle className="flex items-center gap-2 text-white">
						<History className="h-5 w-5" />
						Presence Events
					</DialogTitle>
				</DialogHeader>
				<div className="w-full space-y-4 overflow-hidden">
					<div className="flex items-center gap-2">
						<Popover>
							<PopoverTrigger asChild>
								<Button
									size="sm"
									className="ml-auto border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700"
								>
									<Filter className="h-4 w-4 text-neutral-400" />
									Filters
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-2xs">
								<div className="space-y-4">
									<div className="space-y-2">
										<Label className="text-xs text-neutral-400">
											Event Type
										</Label>
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
											htmlFor="client-select"
											className="text-xs text-neutral-400"
										>
											Device
										</Label>
										<Select
											value={filters.clientMac || ''}
											onValueChange={(value) => {
												handleFilterChange('clientMac', value);
											}}
										>
											<SelectTrigger className="h-8 w-full border-neutral-700 bg-neutral-800 text-white">
												<SelectValue placeholder="All devices" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">All devices</SelectItem>
												{clientsData?.map((client) => (
													<SelectItem
														key={client.id}
														value={client.clientMacAddress}
													>
														{client.clientName} ({client.clientMacAddress})
													</SelectItem>
												))}
											</SelectContent>
										</Select>
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
					</div>

					<div className="h-[calc(95dvh-160px)] w-full rounded-md border border-neutral-800 bg-black">
						{allEvents.length ? (
							<>
								<List
									rowCount={allEvents.length}
									overscanCount={20}
									rowHeight={55}
									rowProps={{
										events: allEvents.reverse()
									}}
									rowComponent={PresenceEventLog}
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
							<div className="flex h-full w-full items-center justify-center">
								<Loader2 className="h-12 w-12 animate-spin" />
							</div>
						) : error ? (
							<div className="flex h-full w-full items-center justify-center text-red-400">
								Failed to load presence events.
							</div>
						) : (
							<div className="flex h-full w-full items-center justify-center text-neutral-400">
								No presence events recorded.
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

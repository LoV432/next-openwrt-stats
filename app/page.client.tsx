'use client';

import {
	getRealTimeTraffic,
	RouterInterfaces
} from '@/lib/server/routerInterfaces';
import { getDhcpDevices } from '@/lib/server/devices';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from '@/components/ui/chart';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const chartConfig = {
	rx: {
		label: 'Download',
		color: 'var(--chart-1)'
	},
	tx: {
		label: 'Upload',
		color: 'var(--chart-2)'
	}
} satisfies ChartConfig;

export function ClientPage({
	routerInterfaces
}: {
	routerInterfaces: Extract<RouterInterfaces, { success: true }>;
}) {
	const [activeDevice, setActiveDevice] = useState('lan4');
	const [trafficHistory, setTrafficHistory] = useState<
		Array<{ time: string; rx: number; tx: number }>
	>([]);

	const realtimeTrafficQuery = useQuery({
		queryKey: ['traffic', activeDevice],
		queryFn: async () => {
			const trafficData = await getRealTimeTraffic(activeDevice);
			if (!trafficData.success) {
				throw new Error(trafficData.error);
			}

			setTrafficHistory((prev) => {
				const now = new Date().toLocaleTimeString();
				const newData = {
					time: now,
					rx: trafficData.data.rxMbps,
					tx: trafficData.data.txMbps
				};
				return [...prev.slice(-15), newData];
			});

			return trafficData.data;
		},
		refetchInterval: 1000
	});
	const dhcpDevicesQuery = useQuery({
		queryKey: ['dhcpDevices'],
		queryFn: async () => {
			const dhcpDevices = await getDhcpDevices();
			if (!dhcpDevices.success) {
				throw new Error(dhcpDevices.error);
			}

			return dhcpDevices.data;
		},
		refetchInterval: 1000
	});
	if (realtimeTrafficQuery.isLoading || dhcpDevicesQuery.isLoading) {
		return <div>Loading...</div>;
	}
	if (realtimeTrafficQuery.isError || dhcpDevicesQuery.isError) {
		return (
			<div>
				Error:{' '}
				{realtimeTrafficQuery.error?.message || dhcpDevicesQuery.error?.message}
			</div>
		);
	}
	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-4 p-4">
			<div className="flex flex-wrap justify-center gap-4">
				{routerInterfaces.data.map((networkInterface) => (
					<button
						key={networkInterface.interface}
						className={`rounded-md px-4 py-2 text-xl ${
							activeDevice === networkInterface.device ||
							activeDevice === networkInterface.l3_device
								? 'bg-primary text-primary-foreground'
								: 'bg-secondary'
						}`}
						onClick={() =>
							setActiveDevice(
								networkInterface.device || networkInterface.l3_device
							)
						}
					>
						{networkInterface.interface}
					</button>
				))}
			</div>

			<ChartContainer className="h-[400px] w-full" config={chartConfig}>
				<LineChart data={trafficHistory}>
					<CartesianGrid />
					<XAxis dataKey="time" className="hidden" />
					<YAxis unit=" Mbps" padding={{ top: 10, bottom: 10 }} />
					<ChartTooltip
						content={<ChartTooltipContent indicator="line" unit="Mbps" />}
					/>
					<Line
						key="rx"
						type="monotone"
						dataKey="rx"
						strokeWidth={4}
						stroke="var(--color-rx)"
						isAnimationActive={false}
					/>
					<Line
						key="tx"
						type="monotone"
						dataKey="tx"
						strokeWidth={4}
						stroke="var(--color-tx)"
						isAnimationActive={false}
					/>
				</LineChart>
			</ChartContainer>

			<div className="flex gap-4">
				<p className="text-xl">
					Download: {realtimeTrafficQuery.data?.rxMbps} Mbps
				</p>
				<p className="text-xl">
					Upload: {realtimeTrafficQuery.data?.txMbps} Mbps
				</p>
			</div>
			<div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{dhcpDevicesQuery.data &&
					Object.entries(dhcpDevicesQuery.data).map(([mac, device]) => (
						<Card key={mac} className="w-full">
							<CardHeader className="pb-2">
								<h3 className="text-lg font-semibold">
									{device.deviceName || 'Unknown Device'}
								</h3>
							</CardHeader>
							<CardContent>
								<div className="space-y-2 text-sm">
									<p className="flex justify-between">
										<span className="text-muted-foreground">IP Address:</span>
										<span className="font-mono">{device.ipAddress}</span>
									</p>
									<p className="flex justify-between">
										<span className="text-muted-foreground">MAC Address:</span>
										<span className="font-mono">{mac}</span>
									</p>
								</div>
							</CardContent>
						</Card>
					))}
			</div>
		</div>
	);
}

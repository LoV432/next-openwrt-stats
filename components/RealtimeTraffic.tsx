'use client';
import {
	getNetworkInterfaces,
	getRealTimeTraffic
} from '@/lib/server/routerInterfaces';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from '@/components/ui/chart';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader } from './ui/card';
import { Progress } from '@/components/ui/progress';
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover';
import { GlobeIcon } from 'lucide-react';
import { InterfacePicker } from './InterfacePicker';
import { NetworkInterface } from '@/types/ubusCalls';

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

export function RealtimeTraffic() {
	const MAX_TRAFFIC = 120;
	const [trafficHistory, setTrafficHistory] = useState<
		Array<{ time: string; rx: number; tx: number }>
	>([]);
	const [activeDevice, setActiveDevice] = useState<NetworkInterface>();

	const { data: networkInterfaces } = useQuery({
		queryKey: ['networkInterfaces'],
		queryFn: async () => {
			const networkInterfaces = await getNetworkInterfaces();
			if (!networkInterfaces.success) {
				throw new Error(networkInterfaces.error);
			}
			if (networkInterfaces.data.length === 0) {
				throw new Error('No network interfaces found');
			}
			return networkInterfaces.data;
		},
		refetchInterval: false
	});
	const defaultDevice = networkInterfaces?.[0];

	const realtimeTrafficQuery = useQuery({
		queryKey: ['traffic'],
		queryFn: async () => {
			const device = activeDevice || defaultDevice;
			if (!device) {
				throw new Error('No active device found');
			}
			const trafficData = await getRealTimeTraffic(
				device.device || device.l3_device
			);
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
		enabled: !!defaultDevice,
		refetchInterval: 1000
	});

	if (realtimeTrafficQuery.isLoading || !realtimeTrafficQuery.data) {
		return <div>Loading...</div>;
	}
	if (realtimeTrafficQuery.isError) {
		return <div>Error: {realtimeTrafficQuery.error?.message}</div>;
	}

	const uploadPercent =
		(realtimeTrafficQuery.data?.txMbps / MAX_TRAFFIC) * 100 > 100
			? 100
			: (realtimeTrafficQuery.data?.txMbps / MAX_TRAFFIC) * 100;

	const downloadPercent =
		(realtimeTrafficQuery.data?.rxMbps / MAX_TRAFFIC) * 100 > 100
			? 100
			: (realtimeTrafficQuery.data?.rxMbps / MAX_TRAFFIC) * 100;

	return (
		<Card className="w-full">
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-semibold">Realtime Traffic</h3>
					{networkInterfaces && networkInterfaces?.length > 1 && (
						<InterfacePicker
							networkInterfaces={networkInterfaces}
							activeDevice={activeDevice || defaultDevice}
							setActiveDevice={setActiveDevice}
						/>
					)}
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-2 text-sm">
					<div className="flex w-full items-center gap-2">
						<span className="text-muted-foreground w-1/4">Download:</span>
						<span className="ml-auto font-mono">
							{realtimeTrafficQuery.data?.rxMbps} Mbps
						</span>
					</div>
					<Progress className="w-full" value={downloadPercent} />
					<div className="flex w-full items-center gap-2">
						<span className="text-muted-foreground w-1/4">Upload:</span>
						<span className="ml-auto font-mono">
							{realtimeTrafficQuery.data?.txMbps} Mbps
						</span>
					</div>
					<Progress className="w-full" value={uploadPercent} />
				</div>
			</CardContent>
		</Card>
	);
}

// {
// 	/* <ChartContainer className="h-[400px] w-full" config={chartConfig}>
// 				<LineChart data={trafficHistory}>
// 					<CartesianGrid />
// 					<XAxis dataKey="time" className="hidden" />
// 					<YAxis unit=" Mbps" padding={{ top: 10, bottom: 10 }} />
// 					<ChartTooltip
// 						content={<ChartTooltipContent indicator="line" unit="Mbps" />}
// 					/>
// 					<Line
// 						key="rx"
// 						type="monotone"
// 						dataKey="rx"
// 						strokeWidth={4}
// 						stroke="var(--color-rx)"
// 						isAnimationActive={false}
// 					/>
// 					<Line
// 						key="tx"
// 						type="monotone"
// 						dataKey="tx"
// 						strokeWidth={4}
// 						stroke="var(--color-tx)"
// 						isAnimationActive={false}
// 					/>
// 				</LineChart>
// 			</ChartContainer> */
// }

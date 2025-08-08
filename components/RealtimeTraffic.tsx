import { getRealTimeTraffic } from '@/lib/server/routerInterfaces';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent
} from '@/components/ui/chart';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

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

export function RealtimeTraffic({ activeDevice }: { activeDevice: string }) {
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

	if (realtimeTrafficQuery.isLoading) {
		return <div>Loading...</div>;
	}
	if (realtimeTrafficQuery.isError) {
		return <div>Error: {realtimeTrafficQuery.error?.message}</div>;
	}

	return (
		<div className="w-full">
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
		</div>
	);
}

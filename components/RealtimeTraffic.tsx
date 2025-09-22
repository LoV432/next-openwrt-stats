'use client';
import { RealTimeTraffic } from '@/lib/server/routerInterfaces';
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
import { useNetwork } from '@/providers/networkContext';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from './ui/dialog';
import {
	ActivityIcon,
	ChartAreaIcon,
	DownloadIcon,
	UploadIcon
} from 'lucide-react';

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

export function RealtimeTraffic({ MAX_TRAFFIC }: { MAX_TRAFFIC: number }) {
	const [trafficHistory, setTrafficHistory] = useState<
		Array<{ time: string; rx: number; tx: number }>
	>([]);
	const { activeDevice, error } = useNetwork();

	const realtimeTrafficQuery = useQuery({
		queryKey: ['traffic'],
		queryFn: async () => {
			if (!activeDevice) {
				throw new Error('No interface selected' + error?.message);
			}
			const trafficData = await fetch(
				'/api/routers/primary/realtime-traffic?device=' +
					(activeDevice.device || activeDevice.l3_device)
			).then((res) => res.json() as Promise<RealTimeTraffic>);
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
		enabled: !!activeDevice,
		refetchInterval: 1000,
		retry: 1
	});

	if (realtimeTrafficQuery.isPaused) {
		return <LoadingErrorCard />;
	}

	if (realtimeTrafficQuery.error) {
		return <LoadingErrorCard error={realtimeTrafficQuery.error?.message} />;
	}

	if (realtimeTrafficQuery.isLoading) {
		return <LoadingErrorCard />;
	}

	if (!realtimeTrafficQuery.data) {
		return <LoadingErrorCard />;
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
			<CardHeader>
				<div className="flex h-4 items-center justify-between">
					<h3 className="text-lg font-semibold">
						<ActivityIcon className="mb-1 mr-2 inline-block" />
						Realtime Traffic
					</h3>
					<Dialog>
						<DialogTrigger asChild>
							<button className="border-1 grid h-9 w-9 place-items-center rounded-md border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700">
								<ChartAreaIcon className="h-5 w-5" />
							</button>
						</DialogTrigger>
						<DialogContent className="w-full max-w-[95vw] sm:max-w-2xl md:max-w-3xl">
							<DialogHeader>
								<DialogTitle>Realtime Traffic Chart</DialogTitle>
							</DialogHeader>
							<ChartContainer
								className="aspect-auto h-[220px] w-full sm:h-[320px] md:h-[420px]"
								config={chartConfig}
							>
								<LineChart data={trafficHistory}>
									<CartesianGrid />
									<XAxis dataKey="time" className="hidden" />
									<YAxis unit=" Mbps" padding={{ top: 10, bottom: 10 }} />
									<ChartTooltip
										content={
											<ChartTooltipContent indicator="line" unit="Mbps" />
										}
									/>
									<Line
										key="rx"
										type="monotone"
										dataKey="rx"
										strokeWidth={4}
										stroke="var(--chart-1)"
										isAnimationActive={false}
									/>
									<Line
										key="tx"
										type="monotone"
										dataKey="tx"
										strokeWidth={4}
										stroke="var(--chart-2)"
										isAnimationActive={false}
									/>
								</LineChart>
							</ChartContainer>
						</DialogContent>
					</Dialog>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-4 text-sm">
					<div className="flex w-full items-center gap-2">
						<span className="text-muted-foreground flex w-2/4 items-center gap-1.5">
							<DownloadIcon className="inline-block h-4 w-4" />
							Download:
						</span>
						<span className="ml-auto ">
							{realtimeTrafficQuery.data?.rxMbps} Mbps
						</span>
					</div>
					<Progress className="w-full" value={downloadPercent} />
					<div className="flex w-full items-center gap-2">
						<span className="text-muted-foreground flex w-2/4 items-center gap-1.5">
							<UploadIcon className="inline-block h-4 w-4" />
							Upload:
						</span>
						<span className="ml-auto ">
							{realtimeTrafficQuery.data?.txMbps} Mbps
						</span>
					</div>
					<Progress className="w-full" value={uploadPercent} />
				</div>
			</CardContent>
		</Card>
	);
}

function LoadingErrorCard({ error }: { error?: string }) {
	return (
		<Card className="w-full">
			<CardHeader>
				<div className="flex h-4 w-full items-center justify-between">
					<h3 className="text-lg font-semibold">
						<ActivityIcon className="mb-1 mr-2 inline-block" />
						Realtime Traffic
					</h3>
				</div>
			</CardHeader>
			<CardContent>
				{error ? (
					<div className="space-y-2 text-sm">
						<div className="flex w-full items-center gap-2">
							<span className="text-muted-foreground w-1/4">Error:</span>
							<span className="ml-auto ">{error}</span>
						</div>
					</div>
				) : (
					<div className="space-y-4 text-sm">
						<div className="flex w-full items-center gap-2">
							<span className="text-muted-foreground w-1/4">Download:</span>
							<span className="ml-auto ">{0} Mbps</span>
						</div>
						<Progress className="w-full" value={0} />
						<div className="flex w-full items-center gap-2">
							<span className="text-muted-foreground w-1/4">Upload:</span>
							<span className="ml-auto ">{0} Mbps</span>
						</div>
						<Progress className="w-full" value={0} />
					</div>
				)}
			</CardContent>
		</Card>
	);
}

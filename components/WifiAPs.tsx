'use client';

import { getWifiAPs } from '@/lib/server/wifiAPs';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from './ui/card';
import { Settings2, WifiIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';

export function WifiAPs() {
	const wifiAPsQuery = useQuery({
		queryKey: ['wifiAPs'],
		queryFn: async () => {
			const wifiAPs = await getWifiAPs();
			if (!wifiAPs.success) {
				throw new Error(wifiAPs.error);
			}

			return wifiAPs.data;
		},
		refetchInterval: false,
		retry: 1
	});

	if (wifiAPsQuery.isError) {
		return (
			<div className="w-full border-y-2 border-zinc-800 py-4">
				<div className="grid h-44 w-full place-items-center text-xl">
					<div className="flex h-full w-full flex-col items-center justify-center">
						<WifiIcon className="h-12 w-12 animate-pulse" />
						Error: {wifiAPsQuery.error?.message}
					</div>
				</div>
			</div>
		);
	}

	if (wifiAPsQuery.isLoading) {
		return (
			<div className="w-full border-y-2 border-zinc-800 py-4">
				<div className="grid h-44 w-full place-items-center text-xl">
					<div className="flex h-full w-full flex-col items-center justify-center">
						<WifiIcon className="h-12 w-12 animate-pulse" />
						Loading Wifi APs...
					</div>
				</div>
			</div>
		);
	}

	if (
		wifiAPsQuery.data &&
		Object.keys(wifiAPsQuery.data.wifiInterfaces).length === 0
	) {
		return <></>;
	}

	return (
		<div className="w-full border-y-2 border-zinc-800 py-4">
			<div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{wifiAPsQuery.data &&
					Object.entries(wifiAPsQuery.data.wifiInterfacesMerged).map(
						([ssid, data]) => (
							<Card key={ssid} className="w-full">
								<CardHeader>
									<h3 className="flex text-lg font-semibold">
										<WifiIcon className="mb-1 mr-1 inline-block" /> {ssid}
										<div className="ml-auto">
											<DetailedWifiAPs
												wifiInterfaces={wifiAPsQuery.data.wifiInterfaces[ssid]}
												ssid={ssid}
											/>
										</div>
									</h3>
									<p>{Array.from(data.ip).join(' / ')}</p>
								</CardHeader>
								<CardContent>
									<div className="space-y-1.5 text-sm">
										<p className="flex justify-between">
											<span className="text-muted-foreground">Channel:</span>
											<span>{Array.from(data.channel).join(' / ')}</span>
										</p>
										<p className="flex justify-between">
											<span className="text-muted-foreground">Band:</span>
											<span>
												{Array.from(data.band)
													.join(' / ')
													.replace('2g', '2.4')
													.replace('5g', '5')}{' '}
												GHz
											</span>
										</p>
										<p className="flex justify-between">
											<span className="text-muted-foreground">Width:</span>
											<span>{Array.from(data.htmode).join(' / ')}</span>
										</p>
										<p className="flex justify-between">
											<span className="text-muted-foreground">Power:</span>
											<span>{Array.from(data.txpower).join(' / ')} dBm</span>
										</p>
									</div>
								</CardContent>
							</Card>
						)
					)}
			</div>
		</div>
	);
}

function DetailedWifiAPs({
	wifiInterfaces,
	ssid
}: {
	wifiInterfaces: {
		ip: string;
		channel: number;
		band: string;
		htmode: string;
		txpower: number;
	}[];
	ssid: string;
}) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline">
					<Settings2 className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="h-[80vh] sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Details for {ssid}</DialogTitle>
				</DialogHeader>
				<div className="w-full overflow-y-auto py-4">
					<div className="flex w-full flex-col gap-5">
						{wifiInterfaces &&
							wifiInterfaces.map((wifiInterface) => (
								<Card
									key={
										wifiInterface.ip +
										wifiInterface.channel +
										wifiInterface.band +
										wifiInterface.htmode +
										wifiInterface.txpower
									}
									className="w-full"
								>
									<CardHeader>
										<h3 className="text-lg font-semibold">
											<WifiIcon className="mb-1 mr-1 inline-block" /> {ssid} on{' '}
											{wifiInterface.ip}
										</h3>
									</CardHeader>
									<CardContent>
										<div className="space-y-1.5 text-sm">
											<p className="flex justify-between">
												<span className="text-muted-foreground">Channel:</span>
												<span>{wifiInterface.channel}</span>
											</p>
											<p className="flex justify-between">
												<span className="text-muted-foreground">Band:</span>
												<span>{wifiInterface.band}</span>
											</p>
											<p className="flex justify-between">
												<span className="text-muted-foreground">Width:</span>
												<span>{wifiInterface.htmode}</span>
											</p>
											<p className="flex justify-between">
												<span className="text-muted-foreground">Power:</span>
												<span>{wifiInterface.txpower} dBm</span>
											</p>
										</div>
									</CardContent>
								</Card>
							))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

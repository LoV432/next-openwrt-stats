'use client';

import { disableWifiAP, getWifiAPs } from '@/lib/server/wifiAPs';
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
									<p>
										{Array.from(data.ip)
											.sort((a, b) => a.localeCompare(b))
											.join(' / ')}
									</p>
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
		configSection: string;
		ip: string;
		channel: number;
		band: string;
		htmode: string;
		txpower: number;
		bitrate?: number;
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
			<DialogContent className="h-[80vh] sm:max-w-[700px]">
				<DialogHeader>
					<DialogTitle>Details for {ssid}</DialogTitle>
				</DialogHeader>

				<div className="w-full overflow-y-auto py-4">
					<div className="flex w-full flex-col gap-4">
						{wifiInterfaces &&
							wifiInterfaces
								.sort((a, b) => a.ip.localeCompare(b.ip))
								.map((wifiInterface, idx) => (
									<div
										key={
											wifiInterface.ip +
											wifiInterface.channel +
											wifiInterface.band +
											wifiInterface.htmode +
											wifiInterface.txpower +
											idx
										}
										className="bg-background w-full rounded-md border px-3 py-3"
									>
										<div className="flex flex-col gap-3 md:flex-row md:items-center">
											<div className="flex-shrink-0">
												<div className="bg-muted rounded-md p-2">
													<WifiIcon className="text-muted-foreground h-5 w-5" />
												</div>
											</div>
											<div className="flex min-w-0 flex-1 flex-col">
												<div className="flex items-center justify-between gap-2">
													<div className="truncate">
														<div className="flex items-center gap-2">
															<span className="truncate text-lg font-semibold">
																{ssid}
															</span>
															<span className="text-muted-foreground truncate text-sm">
																on {wifiInterface.ip}
															</span>
														</div>
													</div>
												</div>
												<div className="text-muted-foreground mt-1 text-sm md:mt-0">
													Channel: {wifiInterface.channel} · Band:{' '}
													{wifiInterface.band} · Width: {wifiInterface.htmode}
												</div>
												<div className="text-muted-foreground mt-1 text-sm">
													Bitrate:{' '}
													{wifiInterface.bitrate
														? wifiInterface.bitrate / 1000
														: '?'}{' '}
													Mbit/s · Power: {wifiInterface.txpower} dBm
												</div>
											</div>
											<div className="ml-auto mt-3 flex flex-wrap items-center gap-2 md:ml-4 md:mt-0">
												<Button
													variant="outline"
													size="sm"
													onClick={() =>
														disableWifiAP({
															routerIP: wifiInterface.ip,
															configSection: wifiInterface.configSection
														})
													}
												>
													Disable
												</Button>{' '}
												<Button variant="destructive" size="sm">
													Remove
												</Button>
											</div>
										</div>
									</div>
								))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

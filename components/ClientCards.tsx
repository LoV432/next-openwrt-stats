'use client';
import { DhcpDevices } from '@/lib/server/dhcpDevices';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from './ui/card';
import { LoaderCircle, RouterIcon, UserIcon, WifiIcon } from 'lucide-react';
import { WifiClients, WifiClientsTraffic } from '@/lib/server/wifiAPs';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
	calcMbps,
	formatBand,
	formatBytes,
	secondsToHumanReadable
} from '@/lib/utils';
import { Button } from './ui/button';
import { useEffect, useState } from 'react';
import { useWifiAPsQuery } from '@/providers/wifiAPsContext';
import { SVGIcon } from './SVGIcons';
import { PresenceHistoryDialog } from './ClientPresence';

export default function ClientCards({
	presenceEnabled
}: {
	presenceEnabled: boolean;
}) {
	const dhcpDevicesQuery = useQuery({
		queryKey: ['dhcpDevices'],
		queryFn: async () => {
			const dhcpDevices = await fetch('/api/routers/all/dhcp-devices').then(
				(res) => res.json() as Promise<DhcpDevices>
			);
			if (!dhcpDevices.success) {
				throw new Error(dhcpDevices.errorMessage);
			}

			return dhcpDevices.data;
		},
		refetchInterval: false,
		retry: 1
	});

	const wifiAPs = useWifiAPsQuery();
	const wifiClientsQuery = useQuery({
		queryKey: ['wifiClients'],
		queryFn: async () => {
			if (!wifiAPs.data?.wifiAPsIfname) {
				throw new Error('No wifiAPsIfname found');
			}
			const wifiClients = await fetch('/api/routers/all/wifi/clients', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ ifnames: wifiAPs.data.wifiAPsIfname })
			}).then((res) => res.json() as Promise<WifiClients>);
			if (!wifiClients.success) {
				throw new Error(wifiClients.errorMessage);
			}

			return wifiClients.data;
		},
		enabled: !!wifiAPs.data?.wifiAPsIfname
	});
	const wifiClientsTrafficQuery = useQuery({
		queryKey: ['wifiClientsTraffic'],
		queryFn: async () => {
			if (!wifiAPs?.data?.wifiAPsIfname) {
				throw new Error('No ifnames found');
			}
			const wifiClientsTraffic = await fetch(
				'/api/routers/all/wifi/clients/traffic',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ ifnames: wifiAPs.data.wifiAPsIfname })
				}
			).then((res) => res.json() as Promise<WifiClientsTraffic>);
			if (!wifiClientsTraffic.success) {
				throw new Error(wifiClientsTraffic.errorMessage);
			}
			return wifiClientsTraffic.data;
		},
		refetchInterval: 3000,
		enabled: !!wifiAPs.data?.wifiAPsIfname
	});

	if (dhcpDevicesQuery.isError) {
		return (
			<div className="w-full py-4">
				<div className="grid h-44 w-full place-items-center text-xl">
					<div className="flex h-full w-full flex-col items-center justify-center">
						<div>Error: {dhcpDevicesQuery.error?.message}</div>
					</div>
				</div>
			</div>
		);
	}

	if (dhcpDevicesQuery.isLoading) {
		return (
			<div className="w-full py-4">
				<div className="grid h-44 w-full place-items-center text-xl">
					<div className="flex h-full w-full flex-col items-center justify-center">
						<LoaderCircle className="h-12 w-12 animate-spin" />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{dhcpDevicesQuery.data &&
				dhcpDevicesQuery.data.map((device) => (
					<ClientCard
						device={device}
						key={device.macAddress}
						wifiData={wifiClientsQuery.data?.[device.macAddress.toUpperCase()]}
						wifiClientTraffic={
							wifiClientsTrafficQuery.data?.[device.macAddress.toUpperCase()]
						}
						presenceEnabled={presenceEnabled}
					/>
				))}
		</div>
	);
}

function ClientCard({
	device,
	wifiData,
	wifiClientTraffic,
	presenceEnabled
}: {
	device: {
		deviceName: string;
		macAddress: string;
		ipAddress: string;
		leaseTime: number | boolean;
	};
	wifiClientTraffic:
		| {
				txBytes: number;
				rxBytes: number;
				time: number;
		  }
		| undefined;
	wifiData:
		| {
				signal: number;
				noise?: number;
				connected_time?: number;
				rx: {
					packets: number;
					bytes: number;
				};
				tx: {
					packets: number;
					bytes: number;
				};
				displayName: string;
				ssid: string;
				band: string;
		  }
		| undefined;
	presenceEnabled: boolean;
}) {
	const [bytesHistory, setBytesHistory] = useState<
		[number, number, number, number][]
	>([]);

	const [realTimeTraffic, setRealTimeTraffic] = useState<{
		rxBytes: number;
		txBytes: number;
	} | null>(null);

	useEffect(() => {
		if (wifiClientTraffic) {
			setBytesHistory((prev) => [
				[
					wifiClientTraffic.time,
					wifiClientTraffic.rxBytes,
					0,
					wifiClientTraffic.txBytes
				],
				...prev.slice(0, 10)
			]);
		}
	}, [wifiClientTraffic]);

	useEffect(() => {
		if (bytesHistory.length > 1) {
			const traffic = calcMbps(bytesHistory[1], bytesHistory[0]);
			setRealTimeTraffic({
				rxBytes: Number(traffic.rxMbps.toFixed(2)),
				txBytes: Number(traffic.txMbps.toFixed(2))
			});
		}
	}, [bytesHistory[0]]);
	return (
		<Card className="w-full gap-2">
			<CardHeader className="relative pb-2 pt-1">
				<span className="absolute -top-5 right-7 text-[13.2px] font-medium text-white/70">
					{wifiData &&
					(realTimeTraffic?.rxBytes || realTimeTraffic?.txBytes) ? (
						<>
							↓ {realTimeTraffic?.txBytes || '0.00'} / ↑{' '}
							{realTimeTraffic?.rxBytes || '0.00'} Mbps
						</>
					) : (
						<></>
					)}
				</span>
				<div className="flex items-center overflow-hidden">
					<div>
						{!wifiData ? (
							<UserIcon />
						) : wifiData.band === '2g' ? (
							<SVGIcon iconName="wifi4" className="h-7 w-7 pb-1" />
						) : wifiData.band === '5g' ? (
							<SVGIcon iconName="wifi5" className="h-7 w-7 pb-1" />
						) : wifiData.band === '6g' ? (
							<SVGIcon iconName="wifi6" className="h-7 w-7 pb-1" />
						) : (
							<WifiIcon className="h-8 w-8" />
						)}
					</div>
					<h3 className="mx-2 overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold">
						{device.deviceName || 'Unknown Device'}
					</h3>
					<div className="ml-auto flex items-center gap-2">
						{presenceEnabled && (
							<PresenceHistoryDialog
								clientMac={device.macAddress}
								clientName={device.deviceName}
							/>
						)}
						{wifiData && (
							<Popover>
								<PopoverTrigger asChild>
									<Button className="gap-1.5" variant="outline" size="sm">
										<RouterIcon className="h-4 w-4" />
										<span className="text-muted-foreground text-sm">
											{wifiData.displayName}
										</span>
									</Button>
								</PopoverTrigger>
								<PopoverContent className="w-80" align="end">
									<div className="space-y-2">
										<h4 className="mb-2 font-medium">
											WiFi Connection Details
										</h4>
										<div className="space-y-1">
											<p className="mt-2 flex justify-between text-sm">
												<span className="text-muted-foreground">Router:</span>
												<span>{wifiData.displayName}</span>
											</p>
											<p className="flex justify-between text-sm">
												<span className="text-muted-foreground">SSID:</span>
												<span>{wifiData.ssid}</span>
											</p>
											<p className="flex justify-between text-sm">
												<span className="text-muted-foreground">Band:</span>
												<span>{formatBand(wifiData.band)}</span>
											</p>
											<p className="flex justify-between text-sm">
												<span className="text-muted-foreground">
													Signal Strength:
												</span>
												<span>{wifiData.signal} dBm</span>
											</p>
											<p className="flex justify-between text-sm">
												<span className="text-muted-foreground">
													Noise Level:
												</span>
												<span>{wifiData.noise || 0} dBm</span>
											</p>
											<p className="flex justify-between text-sm">
												<span className="text-muted-foreground">
													Connected Time:
												</span>
												<span>
													{wifiData.connected_time
														? secondsToHumanReadable(wifiData.connected_time)
														: '- - - -'}
												</span>
											</p>
										</div>
									</div>
								</PopoverContent>
							</Popover>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-2 text-sm">
					<p className="flex justify-between">
						<span className="text-muted-foreground">IP Address:</span>
						<span>{device.ipAddress}</span>
					</p>
					<p className="flex justify-between">
						<span className="text-muted-foreground">MAC Address:</span>
						<span>{device.macAddress}</span>
					</p>
					{/* <p className="flex justify-between">
						<span className="text-muted-foreground">Realtime Traffic:</span>

					</p> */}
					<p className="flex justify-between">
						<span className="text-muted-foreground">Traffic Stats:</span>
						<span>
							{wifiData ? (
								<>
									{formatBytes(wifiData.tx.bytes)} /{' '}
									{formatBytes(wifiData.rx.bytes)}
								</>
							) : (
								<>- - - -</>
							)}
						</span>
					</p>
					<p className="flex justify-between">
						<span className="text-muted-foreground">Lease Time:</span>
						<span>
							{secondsToHumanReadable(Number(device.leaseTime)) || 'Infinite'}
						</span>
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

'use client';
import { DhcpDevices } from '@/lib/server/dhcpDevices';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from './ui/card';
import { LoaderCircle, UserIcon, Wifi } from 'lucide-react';
import { WifiClients } from '@/lib/server/wifiAPs';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { formatBytes, secondsToHumanReadable } from '@/lib/utils';
import { Button } from './ui/button';

export default function ClientCards() {
	const dhcpDevicesQuery = useQuery({
		queryKey: ['dhcpDevices'],
		queryFn: async () => {
			const dhcpDevices = await fetch('/api/routers/all/dhcp-devices').then(
				(res) => res.json() as Promise<DhcpDevices>
			);
			if (!dhcpDevices.success) {
				throw new Error(dhcpDevices.error);
			}

			return dhcpDevices.data;
		},
		refetchInterval: false,
		retry: 1
	});

	const wifiClientsQuery = useQuery({
		queryKey: ['wifiClients'],
		queryFn: async () => {
			const wifiClients = await fetch('/api/routers/all/wifi/clients').then(
				(res) => res.json() as Promise<WifiClients>
			);
			if (!wifiClients.success) {
				throw new Error(wifiClients.error);
			}

			return wifiClients.data;
		},
		refetchInterval: false,
		retry: 1
	});

	if (dhcpDevicesQuery.isError || wifiClientsQuery.isError) {
		return (
			<div className="w-full py-4">
				<div className="grid h-44 w-full place-items-center text-xl">
					<div className="flex h-full w-full flex-col items-center justify-center">
						<div>Error: {dhcpDevicesQuery.error?.message}</div>
						<div>Error: {wifiClientsQuery.error?.message}</div>
					</div>
				</div>
			</div>
		);
	}

	if (dhcpDevicesQuery.isLoading || wifiClientsQuery.isLoading) {
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
						wifiData={wifiClientsQuery.data?.[device.macAddress] ?? null}
					/>
				))}
		</div>
	);
}

function ClientCard({
	device,
	wifiData
}: {
	device: {
		deviceName: string;
		macAddress: string;
		ipAddress: string;
		leaseTime: number | boolean;
	};
	wifiData: {
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
	} | null;
}) {
	return (
		<Card className="w-full gap-2">
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between overflow-hidden">
					<h3 className="mr-2 overflow-hidden text-ellipsis whitespace-nowrap text-lg font-semibold">
						<UserIcon className="mb-1 mr-2 inline-block" />
						{device.deviceName || 'Unknown Device'}
					</h3>
					{wifiData && (
						<div className="flex items-center gap-2">
							<Popover>
								<PopoverTrigger asChild>
									<Button className="gap-1.5" variant="outline" size="sm">
										<Wifi className="h-4 w-4" />
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
												<span>{wifiData.band === '2g' ? '2.4' : '5'} GHz</span>
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
											<div className="my-2 border-t" />
											<div className="space-y-1">
												<p className="text-sm font-medium">Traffic Stats:</p>
												<div className="w-full gap-2 space-y-1">
													<p className="flex justify-between text-sm">
														<span className="text-muted-foreground">
															RX Bytes:
														</span>
														<span>{formatBytes(wifiData.rx.bytes)}</span>
													</p>
													<p className="flex justify-between text-sm">
														<span className="text-muted-foreground">
															TX Bytes:
														</span>
														<span>{formatBytes(wifiData.tx.bytes)}</span>
													</p>
												</div>
											</div>
										</div>
									</div>
								</PopoverContent>
							</Popover>
						</div>
					)}
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

'use client';
import { getDhcpDevices } from '@/lib/server/devices';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from './ui/card';
import { Wifi } from 'lucide-react';
import { getWifiClients } from '@/lib/server/wifiAPs';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export default function ClientCards() {
	const dhcpDevicesQuery = useQuery({
		queryKey: ['dhcpDevices'],
		queryFn: async () => {
			const dhcpDevices = await getDhcpDevices();
			if (!dhcpDevices.success) {
				throw new Error(dhcpDevices.error);
			}

			return dhcpDevices.data;
		},
		refetchInterval: false
	});

	const wifiClientsQuery = useQuery({
		queryKey: ['wifiClients'],
		queryFn: async () => {
			const wifiClients = await getWifiClients();
			if (!wifiClients.success) {
				throw new Error(wifiClients.error);
			}

			return wifiClients.data;
		},
		refetchInterval: false
	});
	if (dhcpDevicesQuery.isLoading || wifiClientsQuery.isLoading) {
		return <div>Loading...</div>;
	}
	if (dhcpDevicesQuery.isError || wifiClientsQuery.isError) {
		return (
			<div>
				Error:{' '}
				{dhcpDevicesQuery.error?.message || wifiClientsQuery.error?.message}
			</div>
		);
	}

	return (
		<div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{dhcpDevicesQuery.data &&
				Object.values(dhcpDevicesQuery.data).map((device) => (
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
		noise: number;
		connected_time: number;
		rx: {
			packets: number;
			bytes: number;
		};
		tx: {
			packets: number;
			bytes: number;
		};
		ip: string;
	} | null;
}) {
	return (
		<Card className="w-full">
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<h3 className="text-lg font-semibold">
						{device.deviceName || 'Unknown Device'}
					</h3>
					{wifiData && (
						<div className="flex items-center gap-2">
							<Popover>
								<PopoverTrigger>
									<div className="hover:bg-muted flex items-center gap-2 rounded-md p-1">
										<Wifi className="h-4 w-4" />
										<span className="text-muted-foreground text-sm">
											{wifiData.signal} dBm
										</span>
									</div>
								</PopoverTrigger>
								<PopoverContent className="w-80">
									<div className="space-y-2">
										<h4 className="mb-2 font-medium">
											WiFi Connection Details
										</h4>
										<div className="space-y-1">
											<p className="mt-2 flex justify-between text-sm">
												<span className="text-muted-foreground">
													Router IP:
												</span>
												<span className="font-mono">{wifiData.ip}</span>
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
												<span>{wifiData.noise} dBm</span>
											</p>
											<p className="flex justify-between text-sm">
												<span className="text-muted-foreground">
													Connected Time:
												</span>
												<span>
													{Math.floor(wifiData.connected_time / 60)} minutes
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
														<span>
															{(wifiData.rx.bytes / 1024 / 1024).toFixed(2)} MB
														</span>
													</p>
													<p className="flex justify-between text-sm">
														<span className="text-muted-foreground">
															TX Bytes:
														</span>
														<span>
															{(wifiData.tx.bytes / 1024 / 1024).toFixed(2)} MB
														</span>
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
						<span className="font-mono">{device.ipAddress}</span>
					</p>
					<p className="flex justify-between">
						<span className="text-muted-foreground">MAC Address:</span>
						<span className="font-mono">{device.macAddress}</span>
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

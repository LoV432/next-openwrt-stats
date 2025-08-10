'use client';
import { getNetworkInterfaces } from '@/lib/server/routerInterfaces';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { InterfacePicker } from './InterfacePicker';
import { NetworkInterface } from '@/types/ubusCalls';
import { secondsToHumanReadable } from '@/lib/utils';
import { WireguardInfo } from './WireguardInfo';

export function NetworkInterfaceInfo() {
	const [activeDevice, setActiveDevice] = useState<NetworkInterface>();

	const networkInterfaces = useQuery({
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

	if (networkInterfaces.isLoading || !networkInterfaces.data) {
		return <div>Loading...</div>;
	}
	if (networkInterfaces.isError) {
		return <div>Error: {networkInterfaces.error?.message}</div>;
	}

	if (!activeDevice) {
		setActiveDevice(networkInterfaces.data[0]);
	}

	return (
		<Card className="w-full">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div className="flex w-full items-center justify-between">
						{networkInterfaces && networkInterfaces.data?.length > 1 && (
							<InterfacePicker
								networkInterfaces={networkInterfaces.data}
								activeDevice={activeDevice}
								setActiveDevice={setActiveDevice}
							/>
						)}
						{activeDevice?.proto === 'wireguard' ? (
							<WireguardInfo interfaceName={activeDevice.interface} />
						) : (
							<h3 className="text-lg font-semibold">Network Interface</h3>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-2 text-sm">
					{activeDevice && (
						<>
							<div className="flex w-full items-center gap-2">
								<span className="text-muted-foreground w-1/4">
									IPv4 Address:
								</span>
								<span className="ml-auto font-mono">
									{activeDevice['ipv4-address']?.[0].address}
								</span>
							</div>
							<div className="flex w-full items-center gap-2 text-sm">
								<span className="text-muted-foreground w-1/4">Gateway IP:</span>
								<span className="ml-auto font-mono">
									{activeDevice['ipv4-address']?.[0].ptpaddress || '- - - -'}
								</span>
							</div>
							<div className="flex w-full items-center gap-2">
								<span className="text-muted-foreground w-1/4">
									DNS Servers:
								</span>
								<span className="ml-auto font-mono">
									{activeDevice['dns-server']?.join(', ') || '- - - -'}
								</span>
							</div>
							<div className="flex w-full items-center gap-2">
								<span className="text-muted-foreground w-1/4">Uptime:</span>
								<span className="ml-auto font-mono">
									{secondsToHumanReadable(activeDevice.uptime)}
								</span>
							</div>
						</>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

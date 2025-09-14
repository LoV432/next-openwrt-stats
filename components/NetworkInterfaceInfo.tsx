'use client';
import { Card, CardContent, CardHeader } from './ui/card';
import { secondsToHumanReadable } from '@/lib/utils';
import { WireguardInfo } from './WireguardInfo';
import { useNetwork } from '@/providers/networkContext';

export function NetworkInterfaceInfo() {
	const { activeDevice, isLoading, error } = useNetwork();

	if (error) {
		return <LoadingErrorCard error={error.message} />;
	}
	if (isLoading) {
		return <LoadingErrorCard />;
	}

	return (
		<Card className="w-full">
			<CardHeader>
				<div className="flex h-4 w-full items-center justify-between">
					<h3 className="text-lg font-semibold">Network Interface</h3>
					{activeDevice?.proto === 'wireguard' && (
						<WireguardInfo interfaceName={activeDevice.interface} />
					)}
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
									{activeDevice['ipv4-address']?.[0]?.address}
								</span>
							</div>
							<div className="flex w-full items-center gap-2 text-sm">
								<span className="text-muted-foreground w-1/4">Gateway IP:</span>
								<span className="ml-auto font-mono">
									{activeDevice['ipv4-address']?.[0]?.ptpaddress || '- - - -'}
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

function LoadingErrorCard({ error }: { error?: string }) {
	return (
		<Card className="w-full">
			<CardHeader>
				<div className="flex h-4 w-full items-center justify-between">
					<h3 className="text-lg font-semibold">Network Interface</h3>
				</div>
			</CardHeader>
			<CardContent>
				{error ? (
					<div className="space-y-2 text-sm">
						<div className="flex w-full items-center gap-2">
							<span className="text-muted-foreground w-1/4">Error:</span>
							<span className="ml-auto font-mono">{error}</span>
						</div>
					</div>
				) : (
					<div className="space-y-2 text-sm">
						<div className="flex w-full items-center gap-2">
							<span className="text-muted-foreground w-1/4">IPv4 Address:</span>
							<span className="ml-auto font-mono">- - - -</span>
						</div>
						<div className="flex w-full items-center gap-2 text-sm">
							<span className="text-muted-foreground w-1/4">Gateway IP:</span>
							<span className="ml-auto font-mono">- - - -</span>
						</div>
						<div className="flex w-full items-center gap-2">
							<span className="text-muted-foreground w-1/4">DNS Servers:</span>
							<span className="ml-auto font-mono">- - - -</span>
						</div>
						<div className="flex w-full items-center gap-2">
							<span className="text-muted-foreground w-1/4">Uptime:</span>
							<span className="ml-auto font-mono">- - - -</span>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

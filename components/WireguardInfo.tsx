'use client';

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from './ui/dialog';
import { getWireguardInterfaces } from '@/lib/server/routerInterfaces';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from './ui/button';
import { NetworkIcon } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface WireguardInfoProps {
	interfaceName: string;
}

export function WireguardInfo({ interfaceName }: WireguardInfoProps) {
	const [open, setOpen] = useState(false);
	const wireguardQuery = useQuery({
		queryKey: ['wireguard', interfaceName],
		queryFn: async () => {
			const response = await getWireguardInterfaces();
			if (!response.success) {
				throw new Error(response.error);
			}
			return response.data[interfaceName];
		},
		enabled: open
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<NetworkIcon className="h-3 w-3" />
				</Button>
			</DialogTrigger>
			<DialogContent className="w-fit sm:max-w-[unset]">
				<DialogHeader>
					<DialogTitle>Wireguard Info - {interfaceName}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					{wireguardQuery.isLoading && <div>Loading...</div>}
					{wireguardQuery.isError && (
						<div>Error: {wireguardQuery.error?.message}</div>
					)}
					{wireguardQuery.data && (
						<div className="space-y-4 break-words">
							<div className="space-y-2">
								<h4 className="font-semibold">Interface</h4>
								<div className="grid grid-cols-[0.5fr_1fr] gap-2 text-sm">
									<span className="text-muted-foreground">Public Key:</span>
									<span className="font-mono">
										{wireguardQuery.data.public_key}
									</span>
									<span className="text-muted-foreground">Listen Port:</span>
									<span>{wireguardQuery.data.listen_port}</span>
								</div>
							</div>
							{wireguardQuery.data.peers &&
								wireguardQuery.data.peers.length > 0 && (
									<div className="space-y-2">
										<h4 className="font-semibold">Peers</h4>
										{wireguardQuery.data.peers.map((peer) => (
											<div
												key={peer.public_key}
												className="space-y-2 rounded-lg border p-3"
											>
												<div className="grid grid-cols-[0.5fr_1fr] gap-2 text-sm">
													<span className="text-muted-foreground">
														Public Key:
													</span>
													<span className="font-mono">{peer.public_key}</span>
													<span className="text-muted-foreground">
														Endpoint:
													</span>
													<span>{peer.endpoint || 'Not connected'}</span>
													<span className="text-muted-foreground">
														Latest Handshake:
													</span>
													<span>
														{parseInt(peer.latest_handshake)
															? new Date(
																	parseInt(peer.latest_handshake) * 1000
																).toLocaleString()
															: 'Never'}
													</span>
													<span className="text-muted-foreground">
														Transfer:
													</span>
													<span>
														↑ {formatBytes(Number(peer.transfer_tx))} /{' '}
														{formatBytes(Number(peer.transfer_rx))} ↓
													</span>
													<span className="text-muted-foreground">
														Allowed IPs:
													</span>
													<span className="font-mono">
														{peer.allowed_ips.join(', ')}
													</span>
												</div>
											</div>
										))}
									</div>
								)}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

'use client';

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from './ui/dialog';
import { WireguardInterfaces } from '@/lib/server/routerInterfaces';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from './ui/button';
import { LoaderCircle, NetworkIcon } from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { DeleteWireguardPeer } from './DeleteWireguardPeer';

interface WireguardInfoProps {
	interfaceName: string;
}

export function WireguardInfo({ interfaceName }: WireguardInfoProps) {
	const [open, setOpen] = useState(false);
	const wireguardQuery = useQuery({
		queryKey: ['wireguard', interfaceName],
		queryFn: async () => {
			const response = await fetch('api/routers/primary/wireguard').then(
				(res) => res.json() as Promise<WireguardInterfaces>
			);
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
			<DialogContent className="flex h-full max-h-[80vh] w-[90vw] max-w-3xl flex-col overflow-hidden">
				<DialogHeader>
					<DialogTitle>Wireguard Info - {interfaceName}</DialogTitle>
				</DialogHeader>
				{wireguardQuery.data ? (
					<div
						className="space-y-4 overflow-y-auto break-all"
						style={{
							scrollbarColor: 'transparent transparent',
							scrollbarWidth: 'thin'
						}}
					>
						<div className="space-y-4">
							<h4 className="font-semibold">Interface</h4>
							<div className="bg-card space-y-2 rounded-lg border p-3">
								<div className="flex flex-wrap gap-2 text-sm">
									<span className="text-muted-foreground">Public Key:</span>
									<span className="ml-auto">
										{wireguardQuery.data.public_key}
									</span>
								</div>
								<div className="flex flex-wrap gap-2 text-sm">
									<span className="text-muted-foreground">Listen Port:</span>
									<span className="ml-auto">
										{wireguardQuery.data.listen_port}
									</span>
								</div>
							</div>
						</div>
						{wireguardQuery.data.peers &&
							wireguardQuery.data.peers.length > 0 && (
								<div className="space-y-2">
									<h4 className="font-semibold">Peers</h4>
									{wireguardQuery.data.peers.map((peer) => (
										<div
											key={peer.public_key}
											className="bg-card space-y-2 rounded-lg border p-3"
										>
											<div className="flex flex-wrap gap-2 text-sm">
												<span className="text-muted-foreground">Name:</span>
												<span className="ml-auto">
													{peer.description || peer.name || 'Untitled Peer'}
												</span>
											</div>
											<div className="flex flex-wrap gap-2 text-sm">
												<span className="text-muted-foreground">
													Public Key:
												</span>
												<span className="ml-auto">{peer.public_key}</span>
											</div>
											<div className="flex flex-wrap gap-2 text-sm">
												<span className="text-muted-foreground">Endpoint:</span>
												<span className="ml-auto">
													{peer.endpoint || '(none)'}
												</span>
											</div>
											<div className="flex flex-wrap gap-2 text-sm">
												<span className="text-muted-foreground">
													Latest Handshake:
												</span>
												<span className="ml-auto">
													{parseInt(peer.latest_handshake || '0')
														? new Date(
																parseInt(peer.latest_handshake || '0') * 1000
															).toLocaleString()
														: 'Never'}
												</span>
											</div>
											<div className="flex flex-wrap gap-2 text-sm">
												<span className="text-muted-foreground">Transfer:</span>
												<span className="ml-auto">
													↑ {formatBytes(Number(peer.transfer_tx || '0'))} /{' '}
													{formatBytes(Number(peer.transfer_rx || '0'))} ↓
												</span>
											</div>
											<div className="flex flex-wrap gap-2 text-sm">
												<span className="text-muted-foreground">
													Allowed IPs:
												</span>
												<span className="ml-auto">
													{peer.allowed_ips?.join(', ') || '- - - -'}
												</span>
											</div>
											<div className="flex justify-end">
												<DeleteWireguardPeer
													sectionName={peer['.name']}
													peerName={
														peer.description || peer.name || 'Untitled Peer'
													}
													refetchWireguardInterfaces={wireguardQuery.refetch}
												/>
											</div>
										</div>
									))}
								</div>
							)}
					</div>
				) : (
					<div className="grid h-full w-full place-items-center">
						<LoaderCircle className="h-12 w-12 animate-spin" />
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

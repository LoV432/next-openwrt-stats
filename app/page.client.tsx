'use client';

import { RouterInterfaces } from '@/lib/server/routerInterfaces';
import { useState } from 'react';
import ClientCards from '@/components/ClientCards';
import { WifiAPs } from '@/components/WifiAPs';
import { RealtimeTraffic } from '@/components/RealtimeTraffic';

export function ClientPage({
	routerInterfaces
}: {
	routerInterfaces: Extract<RouterInterfaces, { success: true }>;
}) {
	const [activeDevice, setActiveDevice] = useState('lan4');

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-4 p-4">
			<div className="flex flex-wrap justify-center gap-4">
				{routerInterfaces.data.map((networkInterface) => (
					<button
						key={networkInterface.interface}
						className={`rounded-md px-4 py-2 text-xl ${
							activeDevice === networkInterface.device ||
							activeDevice === networkInterface.l3_device
								? 'bg-primary text-primary-foreground'
								: 'bg-secondary'
						}`}
						onClick={() =>
							setActiveDevice(
								networkInterface.device || networkInterface.l3_device
							)
						}
					>
						{networkInterface.interface}
					</button>
				))}
			</div>
			<RealtimeTraffic activeDevice={activeDevice} />
			<ClientCards />
			<WifiAPs />
		</div>
	);
}

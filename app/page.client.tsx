'use client';

import {
	getRealTimeStats,
	RouterInterfaces
} from '@/lib/server/routerInterfaces';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export function ClientPage({
	routerInterfaces
}: {
	routerInterfaces: Extract<RouterInterfaces, { success: true }>;
}) {
	const [activeDevice, setActiveDevice] = useState('lan4');
	const query = useQuery({
		queryKey: ['traffic'],
		queryFn: async () => {
			const trafficData = await getRealTimeStats(activeDevice);
			if (!trafficData.success) {
				throw new Error(trafficData.error);
			}
			return trafficData.data;
		},
		refetchInterval: 1000
	});
	if (query.isLoading) {
		return <div>Loading...</div>;
	}
	if (query.isError) {
		return <div>Error: {query.error.message}</div>;
	}
	return (
		<div className="flex flex-col items-center justify-center">
			{routerInterfaces.data.map((networkInterface) => (
				<p
					key={networkInterface.interface}
					className="text-xl"
					onClick={() => setActiveDevice(networkInterface.device)}
				>
					{networkInterface.interface}
				</p>
			))}
			<p>{activeDevice}</p>
			<p>{query.data?.rxMbps}</p>
			<p>{query.data?.txMbps}</p>
		</div>
	);
}

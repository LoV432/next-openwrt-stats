'use client';
import { useQuery } from '@tanstack/react-query';
import { WifiAPs } from '@/lib/server/wifiAPs';

export function useWifiAPsQuery() {
	const wifiAPsQuery = useQuery({
		queryKey: ['wifiAPs'],
		queryFn: async () => {
			const wifiAPs = await fetch('/api/routers/all/wifi/aps').then(
				(res) => res.json() as Promise<WifiAPs>
			);
			if (!wifiAPs.success) {
				throw new Error(wifiAPs.errorMessage);
			}

			return wifiAPs.data;
		},
		refetchInterval: false,
		retry: 1
	});
	return wifiAPsQuery;
}

import { WifiAPsIfname, WifiClientsTraffic } from '@/lib/server/wifiAPs';
import { useQuery } from '@tanstack/react-query';

export default function useWifiClientsTraffic() {
	const wifiIfNamesQuery = useQuery({
		queryKey: ['wifiIfNames'],
		queryFn: async () => {
			const wifiIfNames = await fetch('/api/routers/all/wifi/ifnames').then(
				(res) => res.json() as Promise<WifiAPsIfname>
			);
			if (!wifiIfNames.success) {
				throw new Error(wifiIfNames.error);
			}
			return wifiIfNames.data;
		},
		staleTime: Infinity
	});

	const wifiClientsTrafficQuery = useQuery({
		queryKey: ['wifiClientsTraffic'],
		queryFn: async () => {
			const wifiClientsTraffic = await fetch(
				'/api/routers/all/wifi/clients/traffic',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ ifnames: wifiIfNamesQuery.data })
				}
			).then((res) => res.json() as Promise<WifiClientsTraffic>);
			if (!wifiClientsTraffic.success) {
				throw new Error(wifiClientsTraffic.error);
			}
			return wifiClientsTraffic.data;
		},
		refetchInterval: 3000,
		enabled: wifiIfNamesQuery.data !== undefined
	});

	return wifiClientsTrafficQuery;
}

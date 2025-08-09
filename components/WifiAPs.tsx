'use client';

import { getWifiAPs } from '@/lib/server/wifiAPs';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from './ui/card';

export function WifiAPs() {
	const wifiAPsQuery = useQuery({
		queryKey: ['wifiAPs'],
		queryFn: async () => {
			const wifiAPs = await getWifiAPs();
			if (!wifiAPs.success) {
				throw new Error(wifiAPs.error);
			}

			return wifiAPs.data;
		},
		refetchInterval: false
	});

	if (wifiAPsQuery.isLoading) {
		return <div>Loading...</div>;
	}
	if (wifiAPsQuery.isError) {
		return <div>Error: {wifiAPsQuery.error?.message}</div>;
	}

	return (
		<div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{wifiAPsQuery.data &&
				Object.entries(wifiAPsQuery.data.wifiInterfaces).map(([ssid, data]) => (
					<Card key={ssid} className="w-full">
						<CardHeader>
							<h3 className="text-lg font-semibold">Access Point - {ssid}</h3>
							<p>{Array.from(data.ip).join(' / ')}</p>
						</CardHeader>
						<CardContent>
							<div className="space-y-1.5 text-sm">
								<p className="flex justify-between">
									<span className="text-muted-foreground">Channel:</span>
									<span>{Array.from(data.channel).join(' / ')}</span>
								</p>
								<p className="flex justify-between">
									<span className="text-muted-foreground">Band:</span>
									<span>
										{Array.from(data.band)
											.join(' / ')
											.replace('2g', '2.4')
											.replace('5g', '5')}{' '}
										GHz
									</span>
								</p>
								<p className="flex justify-between">
									<span className="text-muted-foreground">Width:</span>
									<span>{Array.from(data.htmode).join(' / ')}</span>
								</p>
								<p className="flex justify-between">
									<span className="text-muted-foreground">Power:</span>
									<span>{Array.from(data.txpower).join(' / ')} dBm</span>
								</p>
							</div>
						</CardContent>
					</Card>
				))}
		</div>
	);
}

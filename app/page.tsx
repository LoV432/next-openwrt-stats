import { db } from '@/lib/server/dbDriver';
import { routersTable } from '@/drizzle/schema/schema';
import { redirect } from 'next/navigation';
import { RealtimeTraffic } from '@/components/RealtimeTraffic';
import ClientCards from '@/components/ClientCards';
import { WifiAPs } from '@/components/WifiAPs';
import { Header } from '@/components/Header';
import { NetworkInterfaceInfo } from '@/components/NetworkInterfaceInfo';
import { RouterInfo } from '@/components/RouterInfo';
import SeparatorWithText from '@/components/Separator';
export const dynamic = 'force-dynamic';

export default async function Home() {
	const routers = await db.select().from(routersTable);
	if (routers.length === 0) {
		redirect('/register');
	}
	const MAX_TRAFFIC = Number(process.env.MAX_TRAFFIC) || 100;
	return (
		<div className="bg-background mx-auto flex w-full flex-col items-center justify-center gap-4">
			<Header />
			<div className="flex w-full flex-col p-4 sm:w-[80%]">
				<div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
					<RealtimeTraffic MAX_TRAFFIC={MAX_TRAFFIC} />
					<NetworkInterfaceInfo />
					<RouterInfo />
				</div>
				<SeparatorWithText text="Wireless APs" />
				<WifiAPs />
				<SeparatorWithText text="Clients" />
				<ClientCards />
			</div>
		</div>
	);
}

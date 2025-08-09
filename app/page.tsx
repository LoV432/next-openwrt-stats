import { db } from '@/lib/server/dbDriver';
import { routersTable } from '@/db/schema';
import { redirect } from 'next/navigation';
import { RealtimeTraffic } from '@/components/RealtimeTraffic';
import ClientCards from '@/components/ClientCards';
import { WifiAPs } from '@/components/WifiAPs';
import { Header } from '@/components/Header';

export default async function Home() {
	const routers = await db.select().from(routersTable);
	if (routers.length === 0) {
		redirect('/register');
	}

	return (
		<div className="mx-auto flex w-[80%] flex-col items-center justify-center gap-4 p-4">
			<Header />
			<div className="grid w-full grid-cols-3 gap-4">
				<RealtimeTraffic />
			</div>
			<ClientCards />
			<WifiAPs />
		</div>
	);
}

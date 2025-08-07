import { db } from '@/lib/server/dbDriver';
import { routersTable } from '@/db/schema';
import { redirect } from 'next/navigation';
import { getNetworkInterfaces } from '@/lib/server/routerInterfaces';
import { ClientPage } from './page.client';

export default async function Home() {
	const routers = await db.select().from(routersTable);
	if (routers.length === 0) {
		redirect('/register');
	}
	const networkInterfaces = await getNetworkInterfaces();
	if (!networkInterfaces.success) {
		return (
			<div className="flex flex-col items-center justify-center">
				<h1 className="text-3xl font-bold">Openwrt Stats</h1>
				<p className="text-xl">{networkInterfaces.error}</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center justify-center">
			<h1 className="text-3xl font-bold">Openwrt Stats</h1>
			<ClientPage routerInterfaces={networkInterfaces} />
		</div>
	);
}

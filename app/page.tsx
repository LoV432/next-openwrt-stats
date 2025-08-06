import { db } from '@/lib/server/dbDriver';
import { routersTable } from '@/db/schema';
import { redirect } from 'next/navigation';

export default async function Home() {
	const routers = await db.select().from(routersTable);
	if (routers.length === 0) {
		redirect('/register');
	}
}

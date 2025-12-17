import { db } from '@/lib/server/dbDriver';
import { clientsTable } from '@/drizzle/schema/schema';
import { desc } from 'drizzle-orm';

export type Client = {
	id: number;
	clientName: string;
	clientMacAddress: string;
};

export async function GET() {
	if (process.env.PRESENCE_ENABLED !== 'true') {
		return new Response('Not enabled', { status: 500 });
	}

	const clients: Client[] = await db
		.select({
			id: clientsTable.id,
			clientName: clientsTable.clientName,
			clientMacAddress: clientsTable.clientMacAddress
		})
		.from(clientsTable)
		.orderBy(desc(clientsTable.id));

	return new Response(
		JSON.stringify({
			success: true,
			data: clients
		}),
		{
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);
}

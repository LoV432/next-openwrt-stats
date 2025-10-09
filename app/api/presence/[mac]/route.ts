import { db } from '@/lib/server/dbDriver';
import {
	clientsTable,
	presencesEventTable,
	wifisTable
} from '@/drizzle/schema/schema';
import { desc, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { alias } from 'drizzle-orm/sqlite-core';

export type PresenceEvent = {
	id: number;
	timestamp: number;
	client: string;
	event: 'client-connected' | 'client-updated' | 'client-disconnected' | string;
	fromRouter?: string | null;
	fromSSID?: string | null;
	fromBand?: string | null;
	toRouter?: string | null;
	toSSID?: string | null;
	toBand?: string | null;
};

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ mac: string }> }
) {
	if (process.env.PRESENCE_ENABLED !== 'true') {
		return new Response('Not enabled', { status: 500 });
	}
	const { mac: clientMac } = await params;
	if (!clientMac) {
		return new Response(
			JSON.stringify({
				success: false,
				error: 'No clientMac provided'
			}),
			{
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}
	const clientId = await db
		.select({ id: clientsTable.id })
		.from(clientsTable)
		.where(eq(clientsTable.clientMacAddress, clientMac));
	if (!clientId.length) {
		return new Response(
			JSON.stringify({
				success: true,
				data: []
			}),
			{
				status: 404,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}
	const fromWifiAlias = alias(wifisTable, 'fromWifi');
	const toWifiAlias = alias(wifisTable, 'toWifi');
	const presenceEvent = await db
		.select({
			id: presencesEventTable.id,
			timestamp: presencesEventTable.timestamp,
			clientName: clientsTable.clientName,
			event: presencesEventTable.event,
			fromRouter: fromWifiAlias.displayName,
			fromSSID: fromWifiAlias.ssid,
			fromBand: fromWifiAlias.band,
			toRouter: toWifiAlias.displayName,
			toSSID: toWifiAlias.ssid,
			toBand: toWifiAlias.band
		})
		.from(presencesEventTable)
		.where(eq(presencesEventTable.clientId, clientId[0].id))
		.leftJoin(clientsTable, eq(clientsTable.id, presencesEventTable.clientId))
		.leftJoin(
			fromWifiAlias,
			eq(fromWifiAlias.id, presencesEventTable.fromWifiId)
		)
		.leftJoin(toWifiAlias, eq(toWifiAlias.id, presencesEventTable.toWifiId))
		.orderBy(desc(presencesEventTable.timestamp))
		.limit(20);
	if (!presenceEvent.length) {
		return new Response(
			JSON.stringify({
				success: true,
				data: []
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}
	return new Response(
		JSON.stringify({
			success: true,
			data: presenceEvent
		}),
		{
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);
}

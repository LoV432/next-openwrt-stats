import { db } from '@/lib/server/dbDriver';
import {
	clientsTable,
	presencesEventTable,
	wifisTable
} from '@/drizzle/schema/schema';
import { desc, eq, lt, and, or } from 'drizzle-orm';
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
	const { searchParams } = new URL(req.url);
	const cursor = searchParams.get('cursor');
	const limit = parseInt(searchParams.get('limit') || '20');

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
				data: [],
				hasMore: false,
				nextCursor: null
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

	const whereConditions: any[] = [
		eq(presencesEventTable.clientId, clientId[0].id)
	];

	if (cursor) {
		const [cursorTimestamp, cursorId] = cursor.split('_');
		const cursorTimestampNum = parseInt(cursorTimestamp);
		const cursorIdNum = parseInt(cursorId);

		whereConditions.push(
			or(
				lt(presencesEventTable.timestamp, cursorTimestampNum),
				and(
					eq(presencesEventTable.timestamp, cursorTimestampNum),
					lt(presencesEventTable.id, cursorIdNum)
				)
			)
		);
	}

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
		.where(and(...whereConditions))
		.leftJoin(clientsTable, eq(clientsTable.id, presencesEventTable.clientId))
		.leftJoin(
			fromWifiAlias,
			eq(fromWifiAlias.id, presencesEventTable.fromWifiId)
		)
		.leftJoin(toWifiAlias, eq(toWifiAlias.id, presencesEventTable.toWifiId))
		.orderBy(desc(presencesEventTable.timestamp))
		.limit(limit + 1);

	const hasMore = presenceEvent.length > limit;
	const data = hasMore ? presenceEvent.slice(0, -1) : presenceEvent;
	const nextCursor =
		hasMore && data.length > 0
			? `${data[data.length - 1].timestamp}_${data[data.length - 1].id}`
			: null;

	if (!data.length) {
		return new Response(
			JSON.stringify({
				success: true,
				data: [],
				hasMore: false,
				nextCursor: null
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
			data,
			hasMore,
			nextCursor
		}),
		{
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);
}

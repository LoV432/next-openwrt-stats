import { db } from '@/lib/server/dbDriver';
import {
	clientsTable,
	eventTypeIdMap,
	presencesEventTable,
	wifisTable
} from '@/drizzle/schema/schema';
import { desc, lt, gt, and, or, inArray, eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { alias } from 'drizzle-orm/sqlite-core';
import z from 'zod';
import { PresenceEvent } from '../[mac]/route';

const filterSchema = z.object({
	eventType: z
		.string()
		.transform((val) => val.split(',').map((type) => Number(type)))
		.optional(),
	clientMac: z.string().optional(),
	startTime: z
		.string()
		.transform((val) => Number(val))
		.optional(),
	endTime: z
		.string()
		.transform((val) => Number(val))
		.optional()
});

export async function GET(req: NextRequest) {
	if (process.env.PRESENCE_ENABLED !== 'true') {
		return new Response('Not enabled', { status: 500 });
	}

	const { searchParams } = new URL(req.url);
	const cursor = searchParams.get('cursor');
	const limit = parseInt(searchParams.get('limit') || '50');
	const filter = filterSchema.safeParse({
		eventType: searchParams.get('eventType'),
		clientMac: searchParams.get('clientMac'),
		startTime: searchParams.get('startTime') || undefined,
		endTime: searchParams.get('endTime') || undefined
	}).data;

	const fromWifiAlias = alias(wifisTable, 'fromWifi');
	const toWifiAlias = alias(wifisTable, 'toWifi');

	const whereConditions: any[] = [];

	if (filter?.eventType) {
		whereConditions.push(
			inArray(
				presencesEventTable.eventType,
				filter.eventType as (typeof eventTypeIdMap)[keyof typeof eventTypeIdMap][]
			)
		);
	}

	if (filter?.clientMac) {
		whereConditions.push(eq(clientsTable.clientMacAddress, filter.clientMac));
	}

	if (filter?.startTime) {
		whereConditions.push(gt(presencesEventTable.timestamp, filter.startTime));
	}

	if (filter?.endTime) {
		whereConditions.push(lt(presencesEventTable.timestamp, filter.endTime));
	}

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

	const presenceEvent: PresenceEvent[] = await db
		.select({
			id: presencesEventTable.id,
			timestamp: presencesEventTable.timestamp,
			eventType: presencesEventTable.eventType,
			clientMac: clientsTable.clientMacAddress,
			clientName: clientsTable.clientName,
			fromRouter: fromWifiAlias.displayName,
			fromSSID: fromWifiAlias.ssid,
			fromBand: fromWifiAlias.band,
			toRouter: toWifiAlias.displayName,
			toSSID: toWifiAlias.ssid,
			toBand: toWifiAlias.band
		})
		.from(presencesEventTable)
		.where(and(...whereConditions))
		.innerJoin(clientsTable, eq(clientsTable.id, presencesEventTable.clientId))
		.leftJoin(
			fromWifiAlias,
			eq(fromWifiAlias.id, presencesEventTable.fromWifiId)
		)
		.leftJoin(toWifiAlias, eq(toWifiAlias.id, presencesEventTable.toWifiId))
		.orderBy(desc(presencesEventTable.timestamp))
		.limit(limit + 1);

	const hasMore = presenceEvent.length > limit;
	const data: PresenceEvent[] = hasMore
		? presenceEvent.slice(0, -1)
		: presenceEvent;
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

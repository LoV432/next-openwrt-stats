'use server';
import {
	getNetworkInterfacesSchema,
	getRealTimeStatsSchema
} from '@/types/ubusCalls';
import { ubusCall } from './ubusCalls';
import { db } from './dbDriver';
import { routersTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { calcMbps } from '../utils';

export async function getNetworkInterfaces() {
	const primaryRouter = await db
		.select({
			routerIP: routersTable.routerIP
		})
		.from(routersTable)
		.where(eq(routersTable.isPrimary, 1))
		.limit(1);
	const ubusResponse = await ubusCall({
		routerIP: primaryRouter[0].routerIP,
		params: ['network.interface', 'dump', {}]
	});

	if (!ubusResponse.success) {
		return {
			success: false,
			error: ubusResponse.error
		} as const;
	}

	const parsedUbusResponse = getNetworkInterfacesSchema.safeParse(
		ubusResponse.data
	);
	if (!parsedUbusResponse.success) {
		return {
			success: false,
			error: 'Failed to parse ubus response'
		} as const;
	}

	if (parsedUbusResponse.data.result) {
		return {
			success: true,
			data: parsedUbusResponse.data.result[1].interface.filter(
				(i) => i.device !== 'lo'
			)
		} as const;
	}

	return {
		success: false,
		error: 'Failed to parse ubus response'
	} as const;
}
export type RouterInterfaces = Awaited<ReturnType<typeof getNetworkInterfaces>>;

export async function getRealTimeTraffic(device: string) {
	const primaryRouter = await db
		.select({
			routerIP: routersTable.routerIP
		})
		.from(routersTable)
		.where(eq(routersTable.isPrimary, 1))
		.limit(1);
	const ubusResponse = await ubusCall({
		routerIP: primaryRouter[0].routerIP,
		params: [
			'luci',
			'getRealtimeStats',
			{
				device: device,
				mode: 'interface'
			}
		]
	});

	if (!ubusResponse.success) {
		return {
			success: false,
			error: ubusResponse.error
		} as const;
	}

	const parsedUbusResponse = getRealTimeStatsSchema.safeParse(
		ubusResponse.data
	);

	if (!parsedUbusResponse.success) {
		return {
			success: false,
			error: 'Failed to parse ubus response'
		} as const;
	}

	if (parsedUbusResponse.data.result) {
		const reversdData = parsedUbusResponse.data.result[1].result.toReversed();
		const traffic = calcMbps(reversdData[1], reversdData[0]);
		return {
			success: true,
			data: traffic
		} as const;
	}

	return {
		success: false,
		error: 'Failed to parse ubus response'
	} as const;
}

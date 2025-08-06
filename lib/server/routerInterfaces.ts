'use server';
import { getNetworkInterfacesSchema } from '@/types/ubusCalls';
import { ubusCall } from './ubusCalls';
import { db } from './dbDriver';
import { routersTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

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
			data: parsedUbusResponse.data.result[1].interface
		} as const;
	}

	return {
		success: false,
		error: 'Failed to parse ubus response'
	} as const;
}

'use server';
import { db } from './dbDriver';
import { routersTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { pbrPolicySchema } from '@/types/ubusCalls';
import { ubusCall } from './ubusCalls';

export async function getPBRPolicy() {
	const primaryRouter = await db
		.select({
			routerIP: routersTable.routerIP
		})
		.from(routersTable)
		.where(eq(routersTable.isPrimary, 1))
		.limit(1);

	if (!primaryRouter.length) {
		return {
			success: false,
			error: 'No primary router found'
		} as const;
	}

	const pbrPolicyResponse = await ubusCall({
		routerIP: primaryRouter[0].routerIP,
		params: [
			'uci',
			'get',
			{
				config: 'pbr'
			}
		]
	});

	if (!pbrPolicyResponse.success) {
		return {
			success: false,
			error: pbrPolicyResponse.error
		} as const;
	}

	const parsedPbrPolicyResponse = pbrPolicySchema.safeParse(
		pbrPolicyResponse.data
	);
	if (!parsedPbrPolicyResponse.success) {
		return {
			success: false,
			error: 'Failed to parse pbr policy response'
		} as const;
	}

	return {
		success: true,
		data: parsedPbrPolicyResponse.data.result[1].values
	} as const;
}

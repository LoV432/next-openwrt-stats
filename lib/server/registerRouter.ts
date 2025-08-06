'use server';

import { routersTable } from '@/db/schema';
import { db } from './dbDriver';
import { login } from './ubusCalls';
import { ne } from 'drizzle-orm';

export async function registerRouter(
	routerIP: string,
	username: string,
	password: string,
	isPrimary: boolean
) {
	const checkCredentials = await login({
		routerIP,
		username,
		password
	});

	if (!checkCredentials.success) {
		return {
			success: false,
			error: checkCredentials.error
		} as const;
	}

	try {
		return await db.transaction(async (tx) => {
			const addRouter = await tx.insert(routersTable).values({
				username,
				password,
				session: checkCredentials.data.ubus_rpc_session,
				isPrimary: isPrimary ? 1 : 0
			});
			if (isPrimary) {
				await tx
					.update(routersTable)
					.set({ isPrimary: 0 })
					.where(
						ne(routersTable.id, addRouter.lastInsertRowid as unknown as number)
					);
			}
			return {
				success: true,
				data: addRouter.rows
			} as const;
		});
	} catch (error) {
		console.log(error);
		return {
			success: false,
			error: 'Failed to add router'
		} as const;
	}
}

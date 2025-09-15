'use server';

import { db } from './dbDriver';
import { routersTable } from '@/drizzle/schema/schema';

export async function getRouters() {
	try {
		const allRouters = await db
			.select({
				routerIP: routersTable.routerIP,
				isPrimary: routersTable.isPrimary
			})
			.from(routersTable);
		if (!allRouters.length) {
			console.log('[INFO] No routers found');
			return {
				success: false,
				error: 'No routers found'
			} as const;
		}
		return {
			success: true,
			data: allRouters
		} as const;
	} catch (error) {
		console.log('[ERROR] DB query to get routers threw an error', {
			error
		});
		return {
			success: false,
			error: 'DB query to get routers threw an error'
		} as const;
	}
}

import { db } from './dbDriver';
import { routersTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import 'server-only';

export async function getRouters() {
	try {
		const allRouters = await db
			.select({ routerIP: routersTable.routerIP })
			.from(routersTable);
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

export async function getRouter(routerIP: string) {
	try {
		const router = await db
			.select({
				routerIP: routersTable.routerIP,
				username: routersTable.username,
				password: routersTable.password,
				session: routersTable.session,
				isPrimary: routersTable.isPrimary,
				id: routersTable.id
			})
			.from(routersTable)
			.where(eq(routersTable.routerIP, routerIP))
			.limit(1);

		if (!router.length) {
			console.log('[INFO] No router found with routerIP', {
				routerIP
			});
			return {
				success: false,
				error: 'No router found'
			} as const;
		}

		return {
			success: true,
			data: router[0]
		} as const;
	} catch (error) {
		console.log('[ERROR] DB query to get router threw an error', {
			routerIP,
			error
		});
		return {
			success: false,
			error: 'DB query to get router threw an error'
		} as const;
	}
}

export async function getPrimaryRouter() {
	try {
		const primaryRouter = await db
			.select({
				routerIP: routersTable.routerIP
			})
			.from(routersTable)
			.where(eq(routersTable.isPrimary, 1))
			.limit(1);

		if (!primaryRouter.length) {
			console.log('[INFO] No primary router found');
			return {
				success: false,
				error: 'No primary router found'
			} as const;
		}

		return {
			success: true,
			data: primaryRouter[0]
		} as const;
	} catch (error) {
		console.log('[ERROR] DB query to get primary router threw an error', {
			error
		});
		return {
			success: false,
			error: 'DB query to get primary router threw an error'
		} as const;
	}
}

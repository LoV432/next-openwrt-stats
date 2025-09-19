import 'server-only';
import { db } from './dbDriver';
import { routersTable } from '@/drizzle/schema/schema';
import { eq } from 'drizzle-orm';

export type Routers = Awaited<ReturnType<typeof getRouters>>;
export async function getRouters() {
	try {
		const allRouters = await db
			.select({
				displayName: routersTable.displayName,
				isPrimary: routersTable.isPrimary
			})
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

export async function getRouter(displayName: string) {
	try {
		const router = await db
			.select({
				displayName: routersTable.displayName,
				routerIP: routersTable.routerIP,
				username: routersTable.username,
				password: routersTable.password,
				session: routersTable.session,
				isPrimary: routersTable.isPrimary,
				id: routersTable.id
			})
			.from(routersTable)
			.where(eq(routersTable.displayName, displayName))
			.limit(1);

		if (!router.length) {
			console.log('[INFO] No router found with router', {
				displayName
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
			displayName,
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
				displayName: routersTable.displayName
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

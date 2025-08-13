import { db } from './dbDriver';
import { routersTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import 'server-only';

export async function getRouters() {
	const allRouters = await db
		.select({ routerIP: routersTable.routerIP })
		.from(routersTable);
	if (!allRouters.length) {
		return {
			success: false,
			error: 'No routers found'
		} as const;
	}
	return {
		success: true,
		data: allRouters
	} as const;
}

export async function getRouter(routerIP: string) {
	const router = await db
		.select({
			routerIP: routersTable.routerIP,
			username: routersTable.username,
			password: routersTable.password,
			session: routersTable.session,
			isPrimary: routersTable.isPrimary
		})
		.from(routersTable)
		.where(eq(routersTable.routerIP, routerIP))
		.limit(1);

	if (!router.length) {
		return {
			success: false,
			error: 'No router found'
		} as const;
	}

	return {
		success: true,
		data: router[0]
	} as const;
}

export async function getPrimaryRouter() {
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

	return {
		success: true,
		data: primaryRouter[0]
	} as const;
}

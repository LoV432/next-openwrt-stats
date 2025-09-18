'use server';
import 'server-only';
import { routersTable } from '@/drizzle/schema/schema';
import { db } from './dbDriver';
import { login, ubusCall } from './ubusCalls';
import { eq, ne } from 'drizzle-orm';
import { getRouter, getRouters } from './router';

export type Routers = Awaited<ReturnType<typeof getRoutersAction>>;
export async function getRoutersAction() {
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

export async function registerRouterAction(
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
				routerIP,
				username,
				password,
				session: checkCredentials.data.ubus_rpc_session,
				lastAccessed: Date.now(),
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
		console.log('[ERROR] Failed to add router', {
			routerIP,
			username,
			error
		});
		return {
			success: false,
			error: 'Failed to add router'
		} as const;
	}
}

export async function updateRouterAction({
	routerToUpdate,
	routerIP,
	username,
	password,
	isPrimary
}: {
	routerToUpdate: string;
	routerIP?: string;
	username?: string;
	password?: string;
	isPrimary: boolean;
}) {
	try {
		const router = await getRouter(routerToUpdate);
		if (!router.success) {
			return {
				success: false,
				error: `Failed to get router with routerIP ${routerToUpdate}`
			} as const;
		}
		await db.transaction(async (tx) => {
			await tx
				.update(routersTable)
				.set({
					routerIP: routerIP ? routerIP : router.data.routerIP,
					username: username ? username : router.data.username,
					password: password ? password : router.data.password,
					isPrimary: isPrimary ? 1 : 0
				})
				.where(eq(routersTable.routerIP, routerToUpdate));
			if (isPrimary) {
				await tx
					.update(routersTable)
					.set({ isPrimary: 0 })
					.where(ne(routersTable.id, router.data.id));
			}
			const checkPrimaryRouter = await tx
				.select({ id: routersTable.id })
				.from(routersTable)
				.where(eq(routersTable.isPrimary, 1))
				.limit(1);
			if (checkPrimaryRouter.length === 0) {
				const allRouters = await tx
					.select({ id: routersTable.id })
					.from(routersTable);
				if (allRouters.length > 0) {
					await tx
						.update(routersTable)
						.set({ isPrimary: 1 })
						.where(eq(routersTable.id, allRouters[0].id));
				}
			}
		});
		return {
			success: true,
			data: 'Successfully updated router'
		} as const;
	} catch (error) {
		console.log('[ERROR] Failed to update router', {
			routerToUpdate,
			routerIP,
			username,
			error
		});
		return {
			success: false,
			error: 'Failed to update router'
		} as const;
	}
}

export async function deleteRouterAction(routerToDelete: string) {
	try {
		const router = await getRouter(routerToDelete);
		if (!router.success) {
			return {
				success: false,
				error: `Failed to get router with routerIP ${routerToDelete}`
			} as const;
		}
		await db.transaction(async (tx) => {
			await tx.delete(routersTable).where(eq(routersTable.id, router.data.id));
			if (router.data.isPrimary) {
				const allRouters = await tx
					.select({ id: routersTable.id })
					.from(routersTable);
				if (allRouters.length > 0) {
					await tx
						.update(routersTable)
						.set({ isPrimary: 1 })
						.where(eq(routersTable.id, allRouters[0].id));
				}
			}
		});
		const allRouters = await getRouters();
		if (allRouters.success && allRouters.data.length === 0) {
			return {
				success: true,
				redirect: true,
				data: 'Successfully deleted router'
			} as const;
		}
		return {
			success: true,
			data: 'Successfully deleted router'
		} as const;
	} catch (error) {
		console.log('[ERROR] Failed to delete router', {
			routerToDelete,
			error
		});
		return {
			success: false,
			error: 'Failed to delete router'
		} as const;
	}
}

export async function rebootRouterAction(routerToReboot: string) {
	try {
		const router = await getRouter(routerToReboot);
		if (!router.success) {
			return {
				success: false,
				error: `Failed to get router with routerIP ${routerToReboot}`
			} as const;
		}
		const reboot = await ubusCall({
			routerIP: router.data.routerIP,
			params: ['system', 'reboot', {}]
		});

		if (!reboot.success) {
			return {
				success: false,
				error: reboot.error
			} as const;
		}
		return {
			success: true,
			data: 'Successfully rebooted router'
		} as const;
	} catch {
		return {
			success: false,
			error: 'Failed to reboot router'
		} as const;
	}
}

export async function checkRouterStatusAction(routerToCheck: string) {
	try {
		const router = await getRouter(routerToCheck);
		if (!router.success) {
			return {
				success: false,
				error: `Failed to get router with routerIP ${routerToCheck}`
			} as const;
		}
		const loginAction = await login({
			routerIP: router.data.routerIP,
			username: router.data.username,
			password: router.data.password
		});

		if (!loginAction.success) {
			return {
				success: false,
				error: 'Router is offline'
			} as const;
		}

		return {
			success: true,
			error: 'Router is online'
		} as const;
	} catch {
		return {
			success: false,
			error: 'Failed to check router status'
		} as const;
	}
}

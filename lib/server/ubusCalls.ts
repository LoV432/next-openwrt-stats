import {
	failedSessionBatchedSchema,
	failedSessionSchema,
	loginSchema
} from '@/types/ubusCalls';
import { db } from './dbDriver';
import { routersTable } from '@/drizzle/schema/schema';
import { eq } from 'drizzle-orm';
import 'server-only';

export async function ubusCall({
	routerIP,
	params
}: {
	routerIP: string;
	params: [string, string, { [key: string]: any }];
}) {
	const session = await db
		.select({
			sessionKey: routersTable.session,
			username: routersTable.username,
			password: routersTable.password,
			lastAccessed: routersTable.lastAccessed
		})
		.from(routersTable)
		.where(eq(routersTable.routerIP, routerIP))
		.limit(1);
	let sessionKey = session[0].sessionKey;

	if (loginPromises.has(routerIP)) {
		const response = await loginPromises.get(routerIP)!;
		if (response.success) {
			sessionKey = response.data.ubus_rpc_session;
		}
	} else if (session[0].lastAccessed + 3500000 < Date.now()) {
		const newLogin = await dedupedLogin({
			routerIP,
			username: session[0].username,
			password: session[0].password
		});
		if (!newLogin.success) {
			return {
				success: false,
				error: newLogin.error
			} as const;
		}
		sessionKey = newLogin.data.ubus_rpc_session;
	}
	const ubusObject = {
		jsonrpc: '2.0',
		id: 1,
		method: 'call',
		params: [sessionKey, ...params]
	};

	try {
		const response = await fetch('http://' + routerIP + '/ubus', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(ubusObject),
			signal: AbortSignal.timeout(2000)
		});

		const parsedResponse = await response.json();

		const checkFailedSession = failedSessionSchema.safeParse(parsedResponse);
		if (!checkFailedSession.success) {
			try {
				await db
					.update(routersTable)
					.set({
						lastAccessed: Date.now()
					})
					.where(eq(routersTable.routerIP, routerIP));
			} catch (error) {
				console.log(
					'[ERROR] Failed to update lastAccessed in DB after a successful ubus call',
					{
						routerIP,
						error
					}
				);
			}
			return {
				success: true,
				data: parsedResponse
			} as const;
		}
		if (checkFailedSession.success) {
			const newLogin = await dedupedLogin({
				routerIP,
				username: session[0].username,
				password: session[0].password
			});

			if (!newLogin.success) {
				return {
					success: false,
					error: newLogin.error
				} as const;
			}
			try {
				await db
					.update(routersTable)
					.set({ session: newLogin.data.ubus_rpc_session })
					.where(eq(routersTable.routerIP, routerIP));
			} catch (error) {
				console.log(
					'[ERROR] Failed to update session key in DB after a successful login'
				);
				return {
					success: false,
					error: 'Failed to update session key in DB after a successful login'
				} as const;
			}
			const newUbusObject = {
				jsonrpc: '2.0',
				id: 1,
				method: 'call',
				params: [newLogin.data.ubus_rpc_session, ...params]
			};
			const response = await fetch('http://' + routerIP + '/ubus', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(newUbusObject)
			});

			const parsedResponse = await response.json();

			const checkFailedSession = failedSessionSchema.safeParse(parsedResponse);
			if (checkFailedSession.success) {
				console.log('[ERROR] Relogin attempt failed for unknown reason', {
					routerIP,
					checkFailedSession
				});
				return {
					success: false,
					error: 'Relogin attempt failed for unknown reason'
				} as const;
			}
			try {
				await db
					.update(routersTable)
					.set({
						lastAccessed: Date.now()
					})
					.where(eq(routersTable.routerIP, routerIP));
			} catch (error) {
				console.log(
					'[ERROR] Failed to update lastAccessed in DB after a failed ubus call',
					{
						routerIP,
						error
					}
				);
			}
			return {
				success: true,
				data: parsedResponse
			} as const;
		}
		return {
			success: false,
			error: '[ERROR] Something went wrong during ubus call'
		} as const;
	} catch (error) {
		console.log('[ERROR] fetch request threw an error during ubus call', {
			routerIP,
			params,
			error
		});
		return {
			success: false,
			error:
				"Fetch request threw an error during ubus call, Please check your router's IP"
		} as const;
	}
}

export async function ubusBatchCall({
	routerIP,
	calls
}: {
	routerIP: string;
	calls: {
		id: number | string;
		params: [string, string, { [key: string]: any }];
	}[];
}) {
	const session = await db
		.select({
			sessionKey: routersTable.session,
			username: routersTable.username,
			password: routersTable.password,
			lastAccessed: routersTable.lastAccessed
		})
		.from(routersTable)
		.where(eq(routersTable.routerIP, routerIP))
		.limit(1);
	let sessionKey = session[0].sessionKey;

	if (loginPromises.has(routerIP)) {
		const response = await loginPromises.get(routerIP)!;
		if (response.success) {
			sessionKey = response.data.ubus_rpc_session;
		}
	} else if (session[0].lastAccessed + 3500000 < Date.now()) {
		const newLogin = await dedupedLogin({
			routerIP,
			username: session[0].username,
			password: session[0].password
		});
		if (!newLogin.success) {
			return { success: false, error: newLogin.error } as const;
		}
		sessionKey = newLogin.data.ubus_rpc_session;
	}

	const ubusObjects = calls.map((call) => ({
		jsonrpc: '2.0',
		id: call.id,
		method: 'call',
		params: [sessionKey, ...call.params]
	}));

	try {
		const response = await fetch('http://' + routerIP + '/ubus', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(ubusObjects),
			signal: AbortSignal.timeout(2000)
		});

		const parsedResponse = await response.json();

		const checkFailedSession =
			failedSessionBatchedSchema.safeParse(parsedResponse);
		if (!checkFailedSession.success) {
			try {
				await db
					.update(routersTable)
					.set({ lastAccessed: Date.now() })
					.where(eq(routersTable.routerIP, routerIP));
			} catch (error) {
				console.log(
					'[ERROR] Failed to update lastAccessed in DB after successful ubus batch call',
					{ routerIP, error }
				);
			}
			return { success: true, data: parsedResponse } as const;
		}

		const newLogin = await dedupedLogin({
			routerIP,
			username: session[0].username,
			password: session[0].password
		});
		if (!newLogin.success) {
			return { success: false, error: newLogin.error } as const;
		}

		try {
			await db
				.update(routersTable)
				.set({ session: newLogin.data.ubus_rpc_session })
				.where(eq(routersTable.routerIP, routerIP));
		} catch (error) {
			console.log('[ERROR] Failed to update session key in DB after relogin', {
				routerIP,
				error
			});
			return {
				success: false,
				error: 'Failed to update session key in DB after relogin'
			} as const;
		}

		const retriedUbusObjects = calls.map((call) => ({
			jsonrpc: '2.0',
			id: call.id,
			method: 'call',
			params: [newLogin.data.ubus_rpc_session, ...call.params]
		}));

		const retryResponse = await fetch('http://' + routerIP + '/ubus', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(retriedUbusObjects)
		});
		const retriedParsed = await retryResponse.json();

		const checkRetryFailed =
			failedSessionBatchedSchema.safeParse(retriedParsed);
		if (checkRetryFailed.success) {
			console.log('[ERROR] Relogin batch attempt failed', {
				routerIP,
				checkRetryFailed
			});
			return {
				success: false,
				error: 'Relogin batch attempt failed'
			} as const;
		}

		try {
			await db
				.update(routersTable)
				.set({ lastAccessed: Date.now() })
				.where(eq(routersTable.routerIP, routerIP));
		} catch (error) {
			console.log(
				'[ERROR] Failed to update lastAccessed in DB after relogin batch call',
				{ routerIP, error }
			);
		}

		return { success: true, data: retriedParsed } as const;
	} catch (error) {
		console.log('[ERROR] fetch request threw during ubus batch call', {
			routerIP,
			calls,
			error
		});
		return {
			success: false,
			error:
				"Fetch request threw an error during ubus batch call, Please check your router's IP"
		} as const;
	}
}

const loginPromises = new Map<string, ReturnType<typeof login>>();
async function dedupedLogin({
	routerIP,
	username,
	password
}: {
	routerIP: string;
	username: string;
	password: string;
}) {
	if (loginPromises.has(routerIP)) {
		return loginPromises.get(routerIP)!;
	}

	console.log('[INFO] Starting login for router', routerIP);
	const promise = login({ routerIP, username, password }).finally(() => {
		loginPromises.delete(routerIP);
	});

	loginPromises.set(routerIP, promise);
	return promise;
}

export async function login({
	routerIP,
	username,
	password,
	isNew
}: {
	routerIP: string;
	username: string;
	password: string;
	isNew?: boolean;
}) {
	const ubusObject = {
		jsonrpc: '2.0',
		id: 1,
		method: 'call',
		params: [
			'00000000000000000000000000000000',
			'session',
			'login',
			{
				username,
				password,
				timeout: 3600
			}
		]
	};

	try {
		const response = await fetch('http://' + routerIP + '/ubus', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(ubusObject),
			signal: AbortSignal.timeout(2000)
		});

		const ubusResponse = await response.json();
		const parsedUbusResponse = loginSchema.safeParse(ubusResponse);
		if (!parsedUbusResponse.success) {
			console.log('[ERROR] Unknown ubus response from login the call', {
				routerIP,
				username,
				parsedUbusResponse
			});
			return {
				success: false,
				error: 'Unknown ubus response from login the call'
			} as const;
		}

		if (parsedUbusResponse.data.result[0] === 6) {
			console.log('[ERROR] Login failed due to bad credentials', {
				routerIP,
				username,
				password
			});
			return {
				success: false,
				error: 'Login failed due to bad credentials'
			} as const;
		}

		if (!isNew) {
			try {
				await db
					.update(routersTable)
					.set({
						lastAccessed: Date.now(),
						session: parsedUbusResponse.data.result[1].ubus_rpc_session
					})
					.where(eq(routersTable.routerIP, routerIP));
			} catch (error) {
				console.log(
					'[ERROR] Failed to update session key in DB after a successful login',
					{
						routerIP,
						username,
						error
					}
				);
				return {
					success: false,
					error: 'Failed to update session key in DB after a successful login'
				} as const;
			}
		}

		return {
			success: true,
			data: parsedUbusResponse.data.result[1]
		} as const;
	} catch (error) {
		console.log('[ERROR] fetch request threw an error during ubus login call', {
			routerIP,
			username,
			error
		});
		return {
			success: false,
			error:
				"Fetch request threw an error during ubus login call, Please check your router's IP"
		} as const;
	}
}

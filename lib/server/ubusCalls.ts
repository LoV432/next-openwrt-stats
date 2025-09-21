import 'server-only';
import {
	validBatchResponseSchema,
	validResponseSchema,
	loginSchema
} from '@/types/ubusCalls';
import { db } from './dbDriver';
import { routersTable } from '@/drizzle/schema/schema';
import { eq } from 'drizzle-orm';

export async function ubusCall({
	displayName,
	params,
	attemptRetry = true
}: {
	displayName: string;
	params: [string, string, { [key: string]: any }];
	attemptRetry?: boolean;
}) {
	try {
		const session = await getSession(displayName);
		const ubusObject = {
			jsonrpc: '2.0',
			id: 1,
			method: 'call',
			params: [session.sessionKey, ...params]
		};

		let parsedResponse = await sendUbus(session.routerIP, ubusObject);
		if (!parsedResponse.success && attemptRetry) {
			const newLogin = await dedupedLogin({
				routerIP: session.routerIP,
				username: session.username,
				password: session.password
			});

			if (!newLogin.success) {
				return {
					success: false,
					error: newLogin.error
				} as const;
			}
			const newUbusObject = {
				jsonrpc: '2.0',
				id: 1,
				method: 'call',
				params: [newLogin.data.ubus_rpc_session, ...params]
			};
			parsedResponse = await sendUbus(session.routerIP, newUbusObject);
			if (!parsedResponse.success) {
				console.log(
					'[ERROR] Relogin was successful but the command still failed',
					{
						displayName,
						parsedResponse,
						params
					}
				);
				return {
					success: false,
					error: 'Something went while executing the command'
				} as const;
			}
		}
		if (parsedResponse.success) {
			await updateLastAccessed(displayName);
			return {
				success: true,
				data: parsedResponse.data
			} as const;
		}
		return {
			success: false,
			error: 'Something went wrong while executing the command'
		} as const;
	} catch (error) {
		console.log('[ERROR] fetch request threw an error during ubus call', {
			displayName,
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
	displayName,
	calls,
	attemptRetry = true
}: {
	displayName: string;
	calls: {
		id: number | string;
		params: [string, string, { [key: string]: any }];
	}[];
	attemptRetry?: boolean;
}) {
	try {
		const session = await getSession(displayName);
		const ubusObjects = calls.map((call) => ({
			jsonrpc: '2.0',
			id: call.id,
			method: 'call',
			params: [session.sessionKey, ...call.params]
		}));

		let parsedResponse = await sendUbusBatch(session.routerIP, ubusObjects);
		if (!parsedResponse.success && attemptRetry) {
			const newLogin = await dedupedLogin({
				routerIP: session.routerIP,
				username: session.username,
				password: session.password
			});
			if (!newLogin.success) {
				return { success: false, error: newLogin.error } as const;
			}

			const retriedUbusObjects = calls.map((call) => ({
				jsonrpc: '2.0',
				id: call.id,
				method: 'call',
				params: [newLogin.data.ubus_rpc_session, ...call.params]
			}));

			parsedResponse = await sendUbusBatch(
				session.routerIP,
				retriedUbusObjects
			);
			if (!parsedResponse.success) {
				console.log(
					'[ERROR] Relogin was successful but the command still failed',
					{
						displayName,
						parsedResponse,
						calls
					}
				);
				return {
					success: false,
					error:
						'Something went wrong while executing the command. Please see logs for more details'
				} as const;
			}
		}
		if (parsedResponse.success) {
			await updateLastAccessed(displayName);
			return { success: true, data: parsedResponse.data } as const;
		}
		return {
			success: false,
			error: 'Something went wrong while executing the command'
		} as const;
	} catch (error) {
		console.log('[ERROR] fetch request threw during ubus batch call', {
			displayName,
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
		const response = await fetch(routerIP + '/ubus', {
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
				error:
					'Something went wrong during login. Please see logs for more details'
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
					error:
						'Failed to update session key in DB after successful login. Please see logs for more details'
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

async function updateLastAccessed(displayName: string) {
	try {
		await db
			.update(routersTable)
			.set({ lastAccessed: Date.now() })
			.where(eq(routersTable.displayName, displayName));
	} catch (error) {
		console.log(
			'[ERROR] Failed to update lastAccessed in DB after a successful ubus call',
			{ displayName, error }
		);
	}
}

async function getSession(displayName: string) {
	const [session] = await db
		.select({
			routerIP: routersTable.routerIP,
			sessionKey: routersTable.session,
			username: routersTable.username,
			password: routersTable.password,
			lastAccessed: routersTable.lastAccessed
		})
		.from(routersTable)
		.where(eq(routersTable.displayName, displayName))
		.limit(1);

	let sessionKey = session.sessionKey;

	if (loginPromises.has(displayName)) {
		const response = await loginPromises.get(displayName)!;
		if (response.success) sessionKey = response.data.ubus_rpc_session;
	} else if (session.lastAccessed + 3_500_000 < Date.now()) {
		const newLogin = await dedupedLogin({
			routerIP: session.routerIP,
			username: session.username,
			password: session.password
		});
		if (!newLogin.success) throw new Error(newLogin.error);
		sessionKey = newLogin.data.ubus_rpc_session;
	}

	return { ...session, sessionKey };
}

async function sendUbus(routerIP: string, ubusObject: object, timeout = 2000) {
	try {
		const response = await fetch(routerIP + '/ubus', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(ubusObject),
			signal: AbortSignal.timeout(timeout)
		});
		const jsonResponse = await response.json();
		return validResponseSchema.safeParse(jsonResponse);
	} catch (error) {
		console.log('[ERROR] fetch request threw during ubus call', {
			routerIP,
			error
		});
		throw new Error(
			"Fetch request threw an error during ubus call, Please check your router's IP"
		);
	}
}

async function sendUbusBatch(
	routerIP: string,
	calls: object[],
	timeout = 2000
) {
	try {
		const response = await fetch(routerIP + '/ubus', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(calls),
			signal: AbortSignal.timeout(timeout)
		});
		const jsonResponse = await response.json();
		return validBatchResponseSchema.safeParse(jsonResponse);
	} catch (error) {
		console.log('[ERROR] fetch request threw during ubus batch call', {
			routerIP,
			error
		});
		throw new Error(
			"Fetch request threw an error during ubus batch call, Please check your router's IP"
		);
	}
}

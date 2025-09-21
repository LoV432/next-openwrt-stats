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
		if (!session.success) {
			console.log('[ERROR] Failed to get session', {
				displayName,
				params,
				session
			});
			return {
				success: false,
				error: session.errorMessage
			} as const;
		}
		const ubusObject = {
			jsonrpc: '2.0',
			id: 1,
			method: 'call',
			params: [session.data.sessionKey, ...params]
		};

		let parsedResponse = await sendUbus(session.data.routerIP, ubusObject);
		if (!parsedResponse.success && attemptRetry) {
			const newLogin = await dedupedLogin({
				routerIP: session.data.routerIP,
				username: session.data.username,
				password: session.data.password
			});

			if (!newLogin.success) {
				console.log('[ERROR] Failed to relogin', {
					displayName,
					params,
					session,
					newLogin
				});
				return {
					success: false,
					error: newLogin.errorMessage
				} as const;
			}
			const newUbusObject = {
				jsonrpc: '2.0',
				id: 1,
				method: 'call',
				params: [newLogin.data.ubus_rpc_session, ...params]
			};
			parsedResponse = await sendUbus(session.data.routerIP, newUbusObject);
			if (!parsedResponse.success) {
				console.log(
					'[ERROR] Relogin was successful but the command still failed',
					{
						displayName,
						parsedResponse,
						params,
						newLogin
					}
				);
				return {
					success: false,
					error: parsedResponse.errorMessage
				} as const;
			}
		}
		if (!parsedResponse.success) {
			console.log('[ERROR] Failed to execute command', {
				displayName,
				params,
				session,
				parsedResponse
			});
			return {
				success: false,
				error: parsedResponse.errorMessage
			} as const;
		}
		await updateLastAccessed(displayName);
		return {
			success: true,
			data: parsedResponse.data
		} as const;
	} catch (error) {
		console.log('[ERROR] Something went wrong while executing the command', {
			displayName,
			params,
			error
		});
		return {
			success: false,
			error:
				'Something went wrong while executing the command. Please see logs for more details'
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
		if (!session.success) {
			console.log('[ERROR] Failed to get session', {
				displayName,
				calls,
				session
			});
			return {
				success: false,
				error: session.errorMessage
			} as const;
		}
		const ubusObjects = calls.map((call) => ({
			jsonrpc: '2.0',
			id: call.id,
			method: 'call',
			params: [session.data.sessionKey, ...call.params]
		}));

		let parsedResponse = await sendUbusBatch(
			session.data.routerIP,
			ubusObjects
		);
		if (!parsedResponse.success && attemptRetry) {
			const newLogin = await dedupedLogin({
				routerIP: session.data.routerIP,
				username: session.data.username,
				password: session.data.password
			});
			if (!newLogin.success) {
				console.log('[ERROR] Failed to relogin', {
					displayName,
					calls,
					session,
					newLogin
				});
				return {
					success: false,
					error: newLogin.errorMessage
				} as const;
			}

			const retriedUbusObjects = calls.map((call) => ({
				jsonrpc: '2.0',
				id: call.id,
				method: 'call',
				params: [newLogin.data.ubus_rpc_session, ...call.params]
			}));

			parsedResponse = await sendUbusBatch(
				session.data.routerIP,
				retriedUbusObjects
			);
			if (!parsedResponse.success) {
				console.log(
					'[ERROR] Relogin was successful but the command still failed',
					{
						displayName,
						parsedResponse,
						calls,
						newLogin
					}
				);
				return {
					success: false,
					error: parsedResponse.errorMessage
				} as const;
			}
		}
		if (!parsedResponse.success) {
			console.log('[ERROR] Failed to execute command', {
				displayName,
				calls,
				session,
				parsedResponse
			});
			return {
				success: false,
				error: parsedResponse.errorMessage
			} as const;
		}
		await updateLastAccessed(displayName);
		return { success: true, data: parsedResponse.data } as const;
	} catch (error) {
		console.log('[ERROR] Something went wrong while executing the command', {
			displayName,
			calls,
			error
		});
		return {
			success: false,
			error:
				'Something went wrong while executing the command. Please see logs for more details'
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
			return {
				success: false,
				error: parsedUbusResponse.error,
				errorMessage: 'Failed to parse ubus login response'
			} as const;
		}

		if (parsedUbusResponse.data.result[0] === 6) {
			return {
				success: false,
				error: '',
				errorMessage: 'Login failed due to bad credentials'
			} as const;
		}

		if (!isNew) {
			await db
				.update(routersTable)
				.set({
					lastAccessed: Date.now(),
					session: parsedUbusResponse.data.result[1].ubus_rpc_session
				})
				.where(eq(routersTable.routerIP, routerIP));
		}

		return {
			success: true,
			data: parsedUbusResponse.data.result[1]
		} as const;
	} catch (error) {
		return {
			success: false,
			error,
			errorMessage: 'Something went wrong during ubus login call'
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
	try {
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
			if (!newLogin.success) {
				return {
					success: false,
					error: newLogin.error,
					errorMessage: 'Failed to get session'
				} as const;
			}
			sessionKey = newLogin.data.ubus_rpc_session;
		}

		return {
			success: true,
			data: { ...session, sessionKey }
		} as const;
	} catch (error) {
		return {
			success: false,
			error,
			errorMessage: 'Failed to get session'
		} as const;
	}
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
		const parsedResponse = validResponseSchema.safeParse(jsonResponse);
		if (!parsedResponse.success) {
			return {
				success: false,
				error: parsedResponse.error,
				errorMessage: 'Failed to parse ubus response'
			} as const;
		}
		return {
			success: true,
			data: parsedResponse.data
		} as const;
	} catch (error) {
		return {
			success: false,
			error,
			errorMessage: 'Fetch request failed. Please check your router IP'
		} as const;
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
		const parsedResponse = validBatchResponseSchema.safeParse(jsonResponse);
		if (!parsedResponse.success) {
			return {
				success: false,
				error: parsedResponse.error,
				errorMessage: 'Failed to parse ubus batch response'
			} as const;
		}
		return {
			success: true,
			data: parsedResponse.data
		} as const;
	} catch (error) {
		return {
			success: false,
			error,
			errorMessage: 'Fetch request failed. Please check your router IP'
		} as const;
	}
}

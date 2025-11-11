import 'server-only';
import {
	batchResponseSchema,
	validResponseSchema,
	loginSchema,
	accessDeniedSchema
} from '@/types/ubusCalls';
import { db } from './dbDriver';
import { routersTable } from '@/drizzle/schema/schema';
import { eq } from 'drizzle-orm';
import { logError } from '../client/errorLog';

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
			return {
				...session,
				calls: params
			} as const;
		}
		const ubusObject = {
			jsonrpc: '2.0',
			id: 1,
			method: 'call',
			params: [session.data.sessionKey, ...params]
		};

		let callResponse = await sendUbus(session.data.routerIP, ubusObject);
		if (!callResponse.success && attemptRetry) {
			const newLogin = await dedupedLogin({
				routerIP: session.data.routerIP,
				username: session.data.username,
				password: session.data.password
			});

			if (!newLogin.success) {
				return {
					...newLogin,
					calls: params
				} as const;
			}
			const newUbusObject = {
				jsonrpc: '2.0',
				id: 1,
				method: 'call',
				params: [newLogin.data.ubus_rpc_session, ...params]
			};
			callResponse = await sendUbus(session.data.routerIP, newUbusObject);
			if (!callResponse.success) {
				return {
					...callResponse
				} as const;
			}
		}
		if (!callResponse.success) {
			return {
				...callResponse
			} as const;
		}
		await updateLastAccessed(displayName);
		return {
			...callResponse
		} as const;
	} catch (error) {
		return {
			success: false,
			ubusErrorMessage:
				'Something went wrong while executing the command. Please see logs for more details',
			call: params,
			error
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
			return {
				...session,
				calls
			} as const;
		}
		const ubusObjects = calls.map((call) => ({
			jsonrpc: '2.0',
			id: call.id,
			method: 'call',
			params: [session.data.sessionKey, ...call.params]
		}));

		let batchResponse = await sendUbusBatch(session.data.routerIP, ubusObjects);
		if (!batchResponse.success && attemptRetry) {
			const newLogin = await dedupedLogin({
				routerIP: session.data.routerIP,
				username: session.data.username,
				password: session.data.password
			});
			if (!newLogin.success) {
				return {
					...newLogin,
					calls
				} as const;
			}

			const retriedUbusObjects = calls.map((call) => ({
				jsonrpc: '2.0',
				id: call.id,
				method: 'call',
				params: [newLogin.data.ubus_rpc_session, ...call.params]
			}));

			batchResponse = await sendUbusBatch(
				session.data.routerIP,
				retriedUbusObjects
			);
			if (!batchResponse.success) {
				return {
					...batchResponse
				} as const;
			}
		}
		if (!batchResponse.success) {
			return {
				...batchResponse
			} as const;
		}
		await updateLastAccessed(displayName);
		return { success: true, data: batchResponse.data } as const;
	} catch (error) {
		return {
			success: false,
			ubusErrorMessage: 'Something went wrong while executing the command.',
			calls,
			error
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
			body: JSON.stringify(ubusObject)
		});

		const ubusResponse = await response.json();
		const parsedUbusResponse = loginSchema.safeParse(ubusResponse);
		if (!parsedUbusResponse.success) {
			return {
				success: false,
				error: parsedUbusResponse.error,
				ubusErrorMessage: 'Failed to parse ubus login response',
				loginRawResponse: ubusResponse,
				loginCall: ubusObject
			} as const;
		}

		if (parsedUbusResponse.data.result[0] === 6) {
			return {
				success: false,
				ubusErrorMessage: 'Login failed due to bad credentials',
				loginRawResponse: ubusResponse,
				loginCall: ubusObject
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
			ubusErrorMessage:
				'Fetch request failed during login. Please check your router IP and make sure it is reachable'
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
		logError({
			displayName,
			errorMessage:
				'Failed to update lastAccessed in DB after a successful ubus call',
			error
		});
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
					...newLogin
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
			error
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
			const accessDeniedCheck = accessDeniedSchema.safeParse(jsonResponse);
			if (accessDeniedCheck.success) {
				return {
					success: false,
					ubusErrorMessage: 'Access denied',
					rawResponse: jsonResponse,
					params: ubusObject
				} as const;
			}
			return {
				success: false,
				ubusErrorMessage: 'Failed to parse ubus response',
				error: parsedResponse.error,
				rawResponse: jsonResponse,
				params: ubusObject
			} as const;
		}
		return {
			success: true,
			data: parsedResponse.data,
			rawResponse: jsonResponse,
			call: ubusObject
		} as const;
	} catch (error) {
		return {
			success: false,
			error,
			ubusErrorMessage:
				'Fetch request failed during call. Please check your router IP and make sure it is reachable'
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
		const parsedResponse = batchResponseSchema.safeParse(jsonResponse);
		if (!parsedResponse.success) {
			return {
				success: false,
				error: parsedResponse.error,
				ubusErrorMessage: 'Failed to parse ubus batch response',
				rawResponse: jsonResponse,
				call: calls
			} as const;
		}
		const filteredPrasedResponses = parsedResponse.data.map(
			(filteredParsedResponse) => {
				if (filteredParsedResponse.result) {
					return {
						success: true,
						jsonrpc: filteredParsedResponse.jsonrpc,
						id: filteredParsedResponse.id,
						result: filteredParsedResponse.result,
						rawResponse: jsonResponse.find(
							(response: any) => response.id === filteredParsedResponse.id
						),
						call: calls.find(
							(call: any) => call.id === filteredParsedResponse.id
						)
					} as const;
				} else {
					return {
						success: false,
						jsonrpc: filteredParsedResponse.jsonrpc,
						id: filteredParsedResponse.id,
						ubusErrorMessage: 'Failed to parse ubus response',
						rawResponse: jsonResponse.find(
							(response: any) => response.id === filteredParsedResponse.id
						),
						call: calls.find(
							(call: any) => call.id === filteredParsedResponse.id
						)
					} as const;
				}
			}
		);
		return {
			success: true,
			data: filteredPrasedResponses
		} as const;
	} catch (error) {
		return {
			success: false,
			error,
			ubusErrorMessage:
				'Fetch request failed during batch call. Please check your router IP and make sure it is reachable'
		} as const;
	}
}

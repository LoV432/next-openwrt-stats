import { failedSessionSchema, loginSchema } from '@/types/ubusCalls';
import { db } from './dbDriver';
import { routersTable } from '@/db/schema';
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
			password: routersTable.password
		})
		.from(routersTable)
		.where(eq(routersTable.routerIP, routerIP))
		.limit(1);

	const ubusObject = {
		jsonrpc: '2.0',
		id: 1,
		method: 'call',
		params: [session[0].sessionKey, ...params]
	};

	try {
		const response = await fetch('http://' + routerIP + '/ubus', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(ubusObject)
		});

		const parsedResponse = await response.json();

		const checkFailedSession = failedSessionSchema.safeParse(parsedResponse);
		if (checkFailedSession.success) {
			console.log('[INFO] Session expired, logging in again');
			const newLogin = await login({
				routerIP,
				username: session[0].username,
				password: session[0].password
			});

			if (!newLogin.success) {
				console.log('[ERROR] Failed to login again', {
					routerIP,
					username: session[0].username,
					password: session[0].password
				});
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
				console.log('[ERROR] Failed to update session', {
					routerIP,
					username: session[0].username,
					password: session[0].password
				});
				return {
					success: false,
					error: 'Failed to update session, Please try again'
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
				return {
					success: false,
					error: 'Unknown response from router'
				} as const;
			}

			return {
				success: true,
				data: parsedResponse
			} as const;
		}

		return {
			success: true,
			data: parsedResponse
		} as const;
	} catch (error) {
		console.log('[ERROR] Ubus call failed', {
			routerIP,
			params
		});
		return {
			success: false,
			error: "Fetch request failed, Please check your router's IP"
		} as const;
	}
}

export async function login({
	routerIP,
	username,
	password
}: {
	routerIP: string;
	username: string;
	password: string;
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
				timeout: 30
			}
		]
	};

	try {
		const response = await fetch('http://' + routerIP + '/ubus', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(ubusObject)
		});

		const ubusResponse = await response.json();
		const parsedUbusResponse = loginSchema.safeParse(ubusResponse);
		if (!parsedUbusResponse.success) {
			console.log('[ERROR] Unknown ubus response', {
				routerIP,
				username,
				parsedUbusResponse
			});
			return {
				success: false,
				error: 'Unexpected response from router'
			} as const;
		}

		if (parsedUbusResponse.data.result[0] === 6) {
			console.log('[ERROR] Login failed due to bad credentials');
			return {
				success: false,
				error: 'Failed to login, Please check your username and password'
			} as const;
		}

		return {
			success: true,
			data: parsedUbusResponse.data.result[1]
		} as const;
	} catch (error) {
		console.log('[ERROR] Ubus call failed', {
			routerIP,
			username
		});
		return {
			success: false,
			error: "Fetch request failed, Please check your router's IP"
		} as const;
	}
}

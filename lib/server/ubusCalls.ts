import { getNetworkInterfacesSchema, loginSchema } from '@/types/ubusCalls';

export async function ubusCall({
	routerIP,
	params
}: {
	routerIP: string;
	params: [string, string, string, { [key: string]: any }];
}) {
	const ubusObject = {
		jsonrpc: '2.0',
		id: 1,
		method: 'call',
		params
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
	const ubusResponse = await ubusCall({
		routerIP,
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
	});

	if (!ubusResponse.success) {
		return {
			success: false,
			error: ubusResponse.error
		} as const;
	}

	const parsedUbusResponse = loginSchema.safeParse(ubusResponse.data);
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
}

// export async function getNetworkInterfaces(session: string) {
// 	const ubusResponse = await ubusCall([
// 		session,
// 		'network.interface',
// 		'dump',
// 		{}
// 	]);

// 	const parsedUbusResponse = getNetworkInterfacesSchema.safeParse(
// 		ubusResponse.data
// 	);
// 	if (!parsedUbusResponse.success) {
// 		return {
// 			success: false,
// 			error: 'Failed to parse ubus response'
// 		} as const;
// 	}

// 	if (parsedUbusResponse.data.error) {
// 		return {
// 			success: false,
// 			error: parsedUbusResponse.data.error.message
// 		} as const;
// 	}

// 	if (parsedUbusResponse.data.result) {
// 		return {
// 			success: true,
// 			data: parsedUbusResponse.data.result[1].interface
// 		} as const;
// 	}

// 	return {
// 		success: false,
// 		error: 'Failed to parse ubus response'
// 	} as const;
// }

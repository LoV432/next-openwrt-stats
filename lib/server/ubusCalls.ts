'use server';

import { getNetworkInterfacesSchema, loginSchema } from '@/types/ubusCalls';

export async function ubusCall({
	url,
	params
}: {
	url: string;
	params: [string, string, string, { [key: string]: any }];
}) {
	const ubusObject = {
		jsonrpc: '2.0',
		id: 1,
		method: 'call',
		params
	};

	try {
		const response = await fetch('http://' + url + '/ubus', {
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
		return {
			success: false,
			error
		} as const;
	}
}

export async function login({
	url,
	username,
	password
}: {
	url: string;
	username: string;
	password: string;
}) {
	const ubusResponse = await ubusCall({
		url,
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
		return {
			success: false,
			error: 'Failed to parse ubus response'
		} as const;
	}

	if (parsedUbusResponse.data.result[0] === 6) {
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

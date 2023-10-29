import { db } from '@/lib/db';

type tokenFromDBReturnType = {
	id: number;
	token: string;
};

type loginReturnType = {
	id: number;
	result: [number, { ubus_rpc_session: string }?];
};

export async function getToken(forceLogin = false) {
	if (!forceLogin) {
		let tokenFromDB = db
			.prepare('SELECT * FROM rpcdtoken WHERE id = 1')
			.get() as tokenFromDBReturnType;
		return tokenFromDB.token;
	}

	let newToken = await loginToRouter();

	if (!newToken) {
		return undefined;
	}

	db.prepare('UPDATE rpcdtoken SET token = ? WHERE id = 1').run(newToken);
	return newToken;
}

async function loginToRouter() {
	let requestBody = {
		jsonrpc: '2.0',
		id: 1,
		method: 'call',
		params: [
			'00000000000000000000000000000000',
			'session',
			'login',
			{ username: 'readstats', password: process.env.PASSWORD }
		]
	};

	let makeRequest = await fetch(`${process.env.ROUTER_URL}/ubus`, {
		method: 'POST',
		body: JSON.stringify(requestBody),
		headers: {
			'Content-Type': 'application/json'
		},
		cache: 'no-cache'
	});

	let response = (await makeRequest.json()) as loginReturnType;

	if (!response.result[1]) {
		return undefined;
	} else {
		return response.result[1].ubus_rpc_session;
	}
}

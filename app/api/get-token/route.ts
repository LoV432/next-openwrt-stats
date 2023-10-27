import { db } from '@/lib/db';

type tokenFromDBReturnType = {
	id: number;
	token: string;
};

type testLoginReturnType = {
	id: number;
	result?: {
		data: string;
	};
};

type loginReturnType = {
	id: number;
	result: [number, { ubus_rpc_session?: string }];
};

export async function GET() {
	let tokenFromDB = db
		.prepare('SELECT * FROM rpcdtoken WHERE id = 1')
		.get() as tokenFromDBReturnType;

	if (await testToken(tokenFromDB.token)) {
		return new Response(JSON.stringify({ token: tokenFromDB.token }), {
			status: 200
		});
	}

	let newToken = await loginToRouter();

	if (!newToken) {
		return new Response(JSON.stringify({ error: 'Login failed' }), {
			status: 400
		});
	}

	if (await testToken(newToken)) {
		db.prepare('UPDATE rpcdtoken SET token = ? WHERE id = 1').run(newToken);
		return new Response(JSON.stringify({ token: newToken }), {
			status: 200
		});
	}

	return new Response(JSON.stringify({ error: 'Login failed' }), {
		status: 400
	});
}

async function testToken(token: string) {
	let requestBody = {
		jsonrpc: '2.0',
		id: 1,
		method: 'call',
		params: [token, 'file', 'read', { path: '/proc/uptime' }]
	};

	let makeRequest = await fetch(`${process.env.ROUTER_URL}/ubus`, {
		method: 'POST',
		body: JSON.stringify(requestBody),
		headers: {
			'Content-Type': 'application/json'
		},
		cache: 'no-cache'
	});

	let response = (await makeRequest.json()) as testLoginReturnType;

	console.log(response.result);
	if (response.result) {
		return true;
	}
	return false;
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

	if (!response.result[1].ubus_rpc_session) {
		return undefined;
	} else {
		return response.result[1].ubus_rpc_session;
	}
}

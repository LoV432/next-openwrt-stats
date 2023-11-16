import { getToken } from './get-token';

type pppoeResponseReturnType = {
	id: number;
	result?: [0, { stdout: string }?];
};

export type isConnectedJsonType = {
	up: true;
	uptime: number;
	'ipv4-address': [{ address: string }];
};

export type isNotConnectedJsonType = {
	up: false;
};

type pppoeStatusReturnType = isConnectedJsonType | isNotConnectedJsonType;

export async function getPppoeStatus() {
	let token = (await getToken()) as string;
	let pppoeResponse = await makeRequest(token);
	if (!pppoeResponse.result || !pppoeResponse.result[1]) {
		let newToken = await getToken(true);
		if (!newToken) {
			console.log('getPppoeStatus: Token not found');
			return { error: 'Token not found' };
		}
		pppoeResponse = await makeRequest(newToken);
		if (!pppoeResponse.result || !pppoeResponse.result[1]) {
			console.log('getPppoeStatus: Something went wrong');
			return { error: 'Something went wrong' };
		}
	}
	const pppoeStatus = pppoeResponse.result[1].stdout;
	const pppoeStatusJson = JSON.parse(pppoeStatus) as pppoeStatusReturnType;
	return pppoeStatusJson;
}

async function makeRequest(token: string) {
	let requestBody = {
		jsonrpc: '2.0',
		id: 1,
		method: 'call',
		params: [token, 'file', 'exec', { command: '/etc/pppoe-status' }]
	};

	let makeRequest = await fetch(`${process.env.ROUTER_URL}/ubus`, {
		method: 'POST',
		body: JSON.stringify(requestBody),
		headers: {
			'Content-Type': 'application/json'
		},
		cache: 'no-cache'
	});

	return (await makeRequest.json()) as pppoeResponseReturnType;
}

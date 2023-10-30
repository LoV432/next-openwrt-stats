import { getToken } from '@/lib/get-token';

type upTimeReturnType = {
	id: number;
	result?: [0, { data: string }?];
};

export async function getUptime() {
	let token = (await getToken()) as string;
	let uptimeResponse = await makeRequest(token);
	if (!uptimeResponse.result || !uptimeResponse.result[1]) {
		let newToken = await getToken(true);
		if (!newToken) {
			console.log('getUptime: Token not found');
			return 'Token not found';
		}
		uptimeResponse = await makeRequest(newToken);
		if (!uptimeResponse.result || !uptimeResponse.result[1]) {
			console.log('getUptime: Something went wrong');
			return 'Something went wrong';
		}
	}
	let uptime = uptimeResponse.result[1].data;

	return uptime;
}

async function makeRequest(token: string) {
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

	return (await makeRequest.json()) as upTimeReturnType;
}

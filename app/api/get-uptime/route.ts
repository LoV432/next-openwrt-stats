import { getToken } from '@/lib/get-token';

type upTimeReturnType = {
	id: number;
	result?: [0, { data: string }];
};

export async function GET() {
	let token = (await getToken()) as string;
	let uptimeResponse = await getUptime(token);
	if (!uptimeResponse.result) {
		let newToken = await getToken(true);
		if (!newToken) {
			return new Response(JSON.stringify({ error: 'Token not found' }), {
				status: 400
			});
		}
		uptimeResponse = await getUptime(newToken);
		if (!uptimeResponse.result) {
			return new Response(JSON.stringify({ error: 'Something went wrong' }), {
				status: 400
			});
		}
	}
	let uptime = uptimeResponse.result[1].data;

	return new Response(JSON.stringify(uptime), {
		status: 200
	});
}

async function getUptime(token: string) {
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

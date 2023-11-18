import { getToken } from '@/lib/get-token';
export const dynamic = 'force-dynamic';

type speedReturnType = {
	id: number;
	result?: [0, { code: string; stdout: string }?];
};

export async function GET() {
	let token = (await getToken()) as string;
	let speedResponse = await makeRequest(token);
	if (!speedResponse.result || !speedResponse.result[1]) {
		let newToken = await getToken(true);
		if (!newToken) {
			console.log('getSpeed: Token not found');
			return new Response(JSON.stringify({ error: 'Token not found' }), {
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
		speedResponse = await makeRequest(newToken);
		if (!speedResponse.result || !speedResponse.result[1]) {
			console.log('getSpeed: Something went wrong');
			return new Response(JSON.stringify({ error: 'Something went wrong' }), {
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
	}
	let speed = speedResponse.result[1].stdout;
	let formattedSpeed = formatSpeedOutput(speed);
	return new Response(JSON.stringify(formattedSpeed), {
		status: 200,
		headers: {
			'Content-Type': 'application/json'
		}
	});
}

async function makeRequest(token: string) {
	let requestBody = {
		jsonrpc: '2.0',
		id: 1,
		method: 'call',
		params: [token, 'file', 'exec', { command: '/etc/wrtbwmon-update' }]
	};

	let makeRequest = await fetch(`${process.env.ROUTER_URL}/ubus`, {
		method: 'POST',
		body: JSON.stringify(requestBody),
		headers: {
			'Content-Type': 'application/json'
		},
		cache: 'no-cache'
	});

	return (await makeRequest.json()) as speedReturnType;
}

function formatSpeedOutput(speed: string) {
	speed = speed.replace('#mac', 'mac');
	let lines = speed.split('\n');
	lines = lines.filter((line) => line !== '');
	let headers = lines[0].split('\t');
	const result = [];

	for (let i = 1; i < lines.length; i++) {
		const columns = lines[i].split('\t');
		if (!columns.includes('br-lan')) continue;
		const rowData: { [key: string]: string } = {};

		for (let j = 0; j < headers.length; j++) {
			if (headers[j] === 'ip' || headers[j] === 'in' || headers[j] === 'out') {
				rowData[headers[j]] = columns[j];
			}
		}
		result.push(rowData);
	}
	return JSON.parse(JSON.stringify(result));
}

import { getToken } from './get-token';

type speedReturnType = {
	id: number;
	result?: [0, { code: string; stdout: string }?];
};

export async function getSpeed(): Promise<
	{ data: string } | { error: string }
> {
	let token = (await getToken()) as string;
	let speedResponse = await makeRequest(token);
	if (!speedResponse.result || !speedResponse.result[1]) {
		let newToken = await getToken(true);
		if (!newToken) {
			console.log('getSpeed: Token not found');
			return { error: 'Token not found' };
		}
		speedResponse = await makeRequest(newToken);
		if (!speedResponse.result || !speedResponse.result[1]) {
			console.log('getSpeed: Something went wrong');
			return { error: 'Something went wrong' };
		}
	}
	let speed = speedResponse.result[1].stdout as string;
	let formattedSpeed = formatSpeedOutput(speed);
	return { data: formattedSpeed };
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
		if (!columns[2].match('br-lan')) continue;
		const rowData: { [key: string]: string } = {};

		for (let j = 0; j < headers.length; j++) {
			if (
				headers[j] === 'ip' ||
				headers[j] === 'in' ||
				headers[j] === 'out' ||
				headers[j] === 'mac'
			) {
				rowData[headers[j]] = columns[j];
			}
		}
		result.push(rowData);
	}
	return JSON.stringify(result);
}

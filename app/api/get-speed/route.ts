import { getToken } from '@/lib/get-token';

type speedReturnType = {
	id: number;
	result: [0, { code: string; stdout: string }?];
};

export async function GET() {
	let speed = await getSpeed();
	return new Response(speed, {
		status: 200,
		headers: {
			'Content-Type': 'application/json'
		}
	});
}

async function getSpeed() {
	let token = (await getToken()) as string;
	let speedResponse = await makeRequest(token);
	if (
		!(speedResponse && speedResponse.result && speedResponse.result.length > 1)
	) {
		let newToken = await getToken(true);
		if (!newToken) {
			return 'Token not found';
		}
		speedResponse = await makeRequest(newToken);
		if (
			!(
				speedResponse &&
				speedResponse.result &&
				speedResponse.result.length > 1
			)
		) {
			return 'Something went wrong';
		}
	}
	let speed = speedResponse.result[1]?.stdout as string;
	let formattedSpeed = formatSpeedOutput(speed);
	return formattedSpeed;
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
	const lines = speed.split('\n');
	const headers = lines[0].split('\t');
	const result = [];

	for (let i = 1; i < lines.length; i++) {
		const columns = lines[i].split('\t');
		const rowData: { [key: string]: string } = {};

		for (let j = 0; j < headers.length; j++) {
			rowData[headers[j]] = columns[j];
		}

		result.push(rowData);
	}

	return JSON.stringify(result, null, 2);
}

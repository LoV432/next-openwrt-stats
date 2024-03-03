'use server';
import { getToken } from './get-token';

type connectedDeviceResponseType = {
	id: number;
	result?: [0, { stdout: string }?];
};

export async function getConnectedDevices() {
	let token = (await getToken()) as string;
	let getConnectedDevicesResponse = await getConnectedDevicesRequest(token);
	if (
		!getConnectedDevicesResponse.result ||
		!getConnectedDevicesResponse.result[1]
	) {
		let newToken = await getToken(true);
		if (!newToken) {
			console.log('getConnectedDevices: Token not found');
			return { error: 'Token not found' };
		}
		getConnectedDevicesResponse = await getConnectedDevicesRequest(newToken);
		if (
			!getConnectedDevicesResponse.result ||
			!getConnectedDevicesResponse.result[1]
		) {
			console.log('getConnectedDevices: Something went wrong');
			return { error: 'Something went wrong' };
		}
	}
	const connectedDevicesSplit =
		getConnectedDevicesResponse.result[1].stdout.split('\n');
	let connectedDevices = connectedDevicesSplit
		.map((device) => {
			if (!device) return;
			const deviceSplit = device.split(' ');
			return deviceSplit[4];
		})
		.filter((device) => device !== undefined) as string[];
	return connectedDevices;
}

async function getConnectedDevicesRequest(token: string) {
	let requestBody = {
		jsonrpc: '2.0',
		id: 1,
		method: 'call',
		params: [token, 'file', 'exec', { command: '/etc/neigh-probe' }]
	};

	let makeRequest = await fetch(`${process.env.ROUTER_URL}/ubus`, {
		method: 'POST',
		body: JSON.stringify(requestBody),
		headers: {
			'Content-Type': 'application/json'
		},
		cache: 'no-cache'
	});

	return (await makeRequest.json()) as connectedDeviceResponseType;
}

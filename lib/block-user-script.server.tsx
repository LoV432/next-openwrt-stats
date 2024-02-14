'use server';
import { getToken } from './get-token';

type blockDeviceResponseType = {
	id: number;
	result?: [0, { stdout: string }?];
};
export async function blockDevice(macAddress: string) {
	let token = (await getToken()) as string;
	let blockDeviceResponse = await blockDeviceReuqest(token, macAddress);
	if (!blockDeviceResponse.result || !blockDeviceResponse.result[1]) {
		let newToken = await getToken(true);
		if (!newToken) {
			console.log('blockDevice: Token not found');
			return { error: 'Token not found' };
		}
		blockDeviceResponse = await blockDeviceReuqest(newToken, macAddress);
		if (!blockDeviceResponse.result || !blockDeviceResponse.result[1]) {
			console.log('blockDevice: Something went wrong');
			return { error: 'Something went wrong' };
		}
	}
	return true;
}

async function blockDeviceReuqest(token: string, macAddress: string) {
	let requestBody = {
		jsonrpc: '2.0',
		id: 1,
		method: 'call',
		params: [
			token,
			'file',
			'exec',
			{ command: '/etc/block-device', params: [macAddress] }
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

	return (await makeRequest.json()) as blockDeviceResponseType;
}

export async function unblockDevice(macAddress: string) {
	let token = (await getToken()) as string;
	let unblockDeviceResponse = await unblockDeviceReuqest(token, macAddress);
	if (!unblockDeviceResponse.result || !unblockDeviceResponse.result[1]) {
		let newToken = await getToken(true);
		if (!newToken) {
			console.log('unblockDevice: Token not found');
			return { error: 'Token not found' };
		}
		unblockDeviceResponse = await unblockDeviceReuqest(newToken, macAddress);
		if (!unblockDeviceResponse.result || !unblockDeviceResponse.result[1]) {
			console.log('unblockDevice: Something went wrong');
			return { error: 'Something went wrong' };
		}
	}
	return true;
}

async function unblockDeviceReuqest(token: string, macAddress: string) {
	let requestBody = {
		jsonrpc: '2.0',
		id: 1,
		method: 'call',
		params: [
			token,
			'file',
			'exec',
			{ command: '/etc/block-device', params: ['-d', macAddress] }
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

	return (await makeRequest.json()) as blockDeviceResponseType;
}

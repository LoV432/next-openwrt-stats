'use server';
import {
	getNetworkInterfacesSchema,
	getRealTimeStatsSchema,
	wireguardInterfacesSchema
} from '@/types/ubusCalls';
import { ubusCall } from './ubusCalls';
import { calcMbps } from '../utils';
import { getPrimaryRouter } from './routerDB';

export async function getNetworkInterfaces() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	const ubusResponse = await ubusCall({
		routerIP: primaryRouter.data.routerIP,
		params: ['network.interface', 'dump', {}]
	});

	if (!ubusResponse.success) {
		console.log('[ERROR] ubus call to get network interfaces threw an error', {
			routerIP: primaryRouter.data.routerIP,
			error: ubusResponse.error
		});
		return {
			success: false,
			error: ubusResponse.error
		} as const;
	}

	const parsedUbusResponse = getNetworkInterfacesSchema.safeParse(
		ubusResponse.data
	);
	if (!parsedUbusResponse.success) {
		console.log('[ERROR] Failed to parse ubus response', {
			routerIP: primaryRouter.data.routerIP,
			error: parsedUbusResponse.error
		});
		return {
			success: false,
			error: 'Failed to parse ubus response'
		} as const;
	}

	if (parsedUbusResponse.data.result) {
		return {
			success: true,
			data: parsedUbusResponse.data.result[1].interface.filter(
				(i) => i.device !== 'lo'
			)
		} as const;
	}

	return {
		success: false,
		error: 'Failed to parse ubus response'
	} as const;
}

export async function getRealTimeTraffic(device: string) {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	const ubusResponse = await ubusCall({
		routerIP: primaryRouter.data.routerIP,
		params: [
			'luci',
			'getRealtimeStats',
			{
				device: device,
				mode: 'interface'
			}
		]
	});

	if (!ubusResponse.success) {
		console.log('[ERROR] ubus call to get real time traffic threw an error', {
			routerIP: primaryRouter.data.routerIP,
			error: ubusResponse.error
		});
		return {
			success: false,
			error: ubusResponse.error
		} as const;
	}

	const parsedUbusResponse = getRealTimeStatsSchema.safeParse(
		ubusResponse.data
	);

	if (!parsedUbusResponse.success) {
		console.log('[ERROR] Failed to parse ubus response', {
			routerIP: primaryRouter.data.routerIP,
			error: parsedUbusResponse.error
		});
		return {
			success: false,
			error: 'Failed to parse ubus response'
		} as const;
	}

	if (parsedUbusResponse.data.result) {
		const reversdData = parsedUbusResponse.data.result[1].result.toReversed();
		const traffic = calcMbps(reversdData[1], reversdData[0]);
		return {
			success: true,
			data: traffic
		} as const;
	}

	return {
		success: false,
		error: 'Failed to parse ubus response'
	} as const;
}

export async function getWireguardInterfaces() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	const ubusResponse = await ubusCall({
		routerIP: primaryRouter.data.routerIP,
		params: ['luci.wireguard', 'getWgInstances', {}]
	});

	if (!ubusResponse.success) {
		console.log(
			'[ERROR] ubus call to get wireguard interfaces threw an error',
			{
				routerIP: primaryRouter.data.routerIP,
				error: ubusResponse.error
			}
		);
		return {
			success: false,
			error: ubusResponse.error
		} as const;
	}

	const parsedUbusResponse = wireguardInterfacesSchema.safeParse(
		ubusResponse.data
	);

	if (!parsedUbusResponse.success) {
		console.log('[ERROR] Failed to parse ubus response', {
			routerIP: primaryRouter.data.routerIP,
			error: parsedUbusResponse.error
		});
		return {
			success: false,
			error: 'Failed to parse ubus response'
		} as const;
	}

	if (parsedUbusResponse.data.result) {
		return {
			success: true,
			data: parsedUbusResponse.data.result[1]
		} as const;
	}

	return {
		success: false,
		error: 'Failed to parse ubus response'
	} as const;
}

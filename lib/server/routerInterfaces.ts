import 'server-only';
import {
	getNetworkInterfacesSchema,
	getRealTimeStatsSchema,
	wireguardInterfacesSchema
} from '@/types/ubusCalls';
import { ubusCall } from './ubusCalls';
import { calcMbps } from '../utils';
import { getPrimaryRouter } from './router';

export type NetworkInterfaces = Awaited<
	ReturnType<typeof getNetworkInterfaces>
>;
export async function getNetworkInterfaces() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	const ubusResponse = await ubusCall({
		displayName: primaryRouter.data.displayName,
		params: ['network.interface', 'dump', {}]
	});

	if (!ubusResponse.success) {
		return {
			success: false,
			error:
				'Something went wrong while getting the network interfaces. Please see logs for more details'
		} as const;
	}

	const parsedUbusResponse = getNetworkInterfacesSchema.safeParse(
		ubusResponse.data
	);
	if (!parsedUbusResponse.success) {
		console.log('[ERROR] Failed to parse ubus response', {
			displayName: primaryRouter.data.displayName,
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

export type RealTimeTraffic = Awaited<ReturnType<typeof getRealTimeTraffic>>;
export async function getRealTimeTraffic(device: string) {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	const ubusResponse = await ubusCall({
		displayName: primaryRouter.data.displayName,
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
		return {
			success: false,
			error:
				'Something went wrong while getting the real time traffic. Please see logs for more details'
		} as const;
	}

	const parsedUbusResponse = getRealTimeStatsSchema.safeParse(
		ubusResponse.data
	);

	if (!parsedUbusResponse.success) {
		console.log('[ERROR] Failed to parse ubus response', {
			displayName: primaryRouter.data.displayName,
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

export type WireguardInterfaces = Awaited<
	ReturnType<typeof getWireguardInterfaces>
>;
export async function getWireguardInterfaces() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	const ubusResponse = await ubusCall({
		displayName: primaryRouter.data.displayName,
		params: ['luci.wireguard', 'getWgInstances', {}]
	});

	if (!ubusResponse.success) {
		return {
			success: false,
			error:
				'Something went wrong while getting the wireguard interfaces. Please see logs for more details'
		} as const;
	}

	const parsedUbusResponse = wireguardInterfacesSchema.safeParse(
		ubusResponse.data
	);

	if (!parsedUbusResponse.success) {
		console.log('[ERROR] Failed to parse ubus response', {
			displayName: primaryRouter.data.displayName,
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

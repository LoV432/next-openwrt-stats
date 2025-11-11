import 'server-only';
import {
	getNetworkInterfacesSchema,
	getRealTimeStatsSchema,
	wireguardInterfacesSchema,
	wireguardPeerConfigArraySchema
} from '@/types/ubusCalls';
import { ubusBatchCall, ubusCall } from './ubusCalls';
import { calcMbps } from '../utils';
import { getPrimaryRouter } from './router';
import { logError } from '../client/errorLog';

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
		logError({
			displayName: primaryRouter.data.displayName,
			errorMessage: 'Failed to get network interfaces',
			...ubusResponse
		});
		return {
			success: false,
			error: 'Something went wrong while getting the network interfaces.'
		} as const;
	}

	const parsedUbusResponse = getNetworkInterfacesSchema.safeParse(
		ubusResponse.data
	);
	if (!parsedUbusResponse.success) {
		logError({
			displayName: primaryRouter.data.displayName,
			errorMessage: 'Failed to parse network interfaces response',
			zodError: parsedUbusResponse.error,
			...ubusResponse
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
		logError({
			displayName: primaryRouter.data.displayName,
			errorMessage: 'Failed to get real time traffic',
			...ubusResponse
		});
		return {
			success: false,
			error: 'Something went wrong while getting the real time traffic.'
		} as const;
	}

	const parsedUbusResponse = getRealTimeStatsSchema.safeParse(
		ubusResponse.data
	);

	if (!parsedUbusResponse.success) {
		logError({
			displayName: primaryRouter.data.displayName,
			errorMessage: 'Failed to parse real-time traffic stats response',
			zodError: parsedUbusResponse.error,
			...ubusResponse
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

export type WireguardPeer = {
	'.name': string;
	'.type': string;
	public_key: string;
	private_key?: string;
	preshared_key?: string;
	description?: string;
	name?: string;
	endpoint_host?: string;
	endpoint_port?: string;
	allowed_ips?: string[];
	persistent_keepalive?: string;
	disabled?: string;
	endpoint?: string;
	latest_handshake?: string;
	transfer_rx?: string;
	transfer_tx?: string;
};
export async function getWireguardInterfaces() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	// const ubusResponse = await ubusCall({
	// 	displayName: primaryRouter.data.displayName,
	// 	params: ['luci.wireguard', 'getWgInstances', {}]
	// });

	const ubusResponse = await ubusBatchCall({
		displayName: primaryRouter.data.displayName,
		calls: [
			{
				id: 1,
				params: ['luci.wireguard', 'getWgInstances', {}]
			},
			{
				id: 2,
				params: ['uci', 'get', { config: 'network' }]
			}
		]
	});

	if (!ubusResponse.success) {
		logError({
			displayName: primaryRouter.data.displayName,
			errorMessage: 'Failed to get wireguard interfaces',
			...ubusResponse
		});
		return {
			success: false,
			error: 'Something went wrong while getting the wireguard interfaces.'
		} as const;
	}

	const luciWireguardInterfaces = ubusResponse.data
		.filter((response) => response.id === 1)
		.map((response) => response)[0];
	const networkInterfaces = ubusResponse.data
		.filter((response) => response.id === 2)
		.map((response) => response)[0];

	if (!luciWireguardInterfaces.success || !networkInterfaces.success) {
		!luciWireguardInterfaces.success &&
			logError({
				displayName: primaryRouter.data.displayName,
				...luciWireguardInterfaces
			});
		!networkInterfaces.success &&
			logError({
				displayName: primaryRouter.data.displayName,
				...networkInterfaces
			});
		return {
			success: false,
			error: 'Failed to parse ubus response'
		} as const;
	}

	const peersFromNetworkInterfaces = Object.values(
		networkInterfaces.result[1].values
	).filter((interfaceConfig: any) =>
		interfaceConfig?.['.type'].startsWith('wireguard')
	);

	const parsedWireguardPeers = wireguardPeerConfigArraySchema.safeParse(
		peersFromNetworkInterfaces
	);

	if (!parsedWireguardPeers.success) {
		logError({
			displayName: primaryRouter.data.displayName,
			zodError: parsedWireguardPeers.error,
			...peersFromNetworkInterfaces
		});
		return {
			success: false,
			error: 'Failed to parse ubus response'
		} as const;
	}

	const parsedLuciWireguardInterfaces = wireguardInterfacesSchema.safeParse(
		luciWireguardInterfaces.result[1]
	);
	if (!parsedLuciWireguardInterfaces.success) {
		logError({
			displayName: primaryRouter.data.displayName,
			zodError: parsedLuciWireguardInterfaces.error,
			...luciWireguardInterfaces
		});
		return {
			success: false,
			error: 'Failed to parse ubus response'
		} as const;
	}

	let wireguardInterfaces: {
		[key: string]: {
			name: string;
			public_key: string;
			listen_port: string;
			fwmark: string;
			peers: WireguardPeer[];
		};
	} = {};

	Object.values(parsedLuciWireguardInterfaces.data.result[1]).forEach(
		(wgInterface) => {
			const peers = parsedWireguardPeers.data.filter(
				(peer) => peer['.type'] === `wireguard_${wgInterface.name}`
			);

			const peersWithLiveData = peers.map((peer) => {
				const liveData = wgInterface.peers.find(
					(livePeer) => livePeer.public_key === peer.public_key
				);

				return {
					...peer,
					...liveData
				};
			});

			wireguardInterfaces[wgInterface.name] = {
				name: wgInterface.name,
				public_key: wgInterface.public_key,
				listen_port: wgInterface.listen_port,
				fwmark: wgInterface.fwmark,
				peers: peersWithLiveData
			};
		}
	);

	return {
		success: true,
		data: wireguardInterfaces
	} as const;
}

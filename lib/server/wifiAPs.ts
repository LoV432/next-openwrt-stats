'use server';

import { getRouter, getRouters } from './routerDB';
import { ubusCall } from './ubusCalls';
import {
	wifiAPsSchema,
	WifiClients,
	wifiClientsSchema
} from '@/types/ubusCalls';

export async function getWifiAPs() {
	const allRouters = await getRouters();
	if (!allRouters.success) {
		return allRouters;
	}

	const wifiInterfaces: {
		[key: string]: {
			configSection: string;
			ip: string;
			channel: number;
			band: string;
			htmode: string;
			txpower: number;
			bitrate?: number;
		}[];
	} = {};

	const wifiInterfacesMerged: {
		[key: string]: {
			ip: Set<string>;
			channel: Set<number>;
			band: Set<string>;
			htmode: Set<string>;
			txpower: Set<number>;
			bitrate: Set<number>;
		};
	} = {};

	const allIfname: { [key: string]: string[] } = {};

	await Promise.all(
		allRouters.data.map(async (router) => {
			const ubusResponse = await ubusCall({
				routerIP: router.routerIP,
				params: ['luci-rpc', 'getWirelessDevices', {}]
			});
			if (!ubusResponse.success) {
				console.log('[ERROR] ubus call to get wifi APs threw an error', {
					routerIP: router.routerIP,
					error: ubusResponse.error
				});
				return;
			}

			const parsedUbusResponse = wifiAPsSchema.safeParse(ubusResponse.data);
			if (!parsedUbusResponse.success) {
				console.log('[ERROR] Failed to parse ubus response from wifiAPs', {
					routerIP: router.routerIP,
					error: parsedUbusResponse.error
				});
				return;
			}
			for (const radio of Object.values(parsedUbusResponse.data.result[1])) {
				for (const radioInterface of radio.interfaces || []) {
					if (!wifiInterfaces[radioInterface.iwinfo.ssid]) {
						wifiInterfaces[radioInterface.iwinfo.ssid] = [];
					}
					wifiInterfaces[radioInterface.iwinfo.ssid].push({
						configSection: radioInterface.section,
						ip: router.routerIP,
						channel: radioInterface.iwinfo.channel,
						band: radio.config.band,
						htmode: radio.config.htmode,
						txpower: radioInterface.iwinfo.txpower,
						bitrate: radioInterface.iwinfo.bitrate
					});
					if (!wifiInterfacesMerged[radioInterface.iwinfo.ssid]) {
						wifiInterfacesMerged[radioInterface.iwinfo.ssid] = {
							ip: new Set(),
							channel: new Set(),
							band: new Set(),
							htmode: new Set(),
							txpower: new Set(),
							bitrate: new Set()
						};
					}
					wifiInterfacesMerged[radioInterface.iwinfo.ssid].ip.add(
						router.routerIP
					);
					wifiInterfacesMerged[radioInterface.iwinfo.ssid].channel.add(
						radioInterface.iwinfo.channel
					);
					wifiInterfacesMerged[radioInterface.iwinfo.ssid].band.add(
						radio.config.band
					);
					wifiInterfacesMerged[radioInterface.iwinfo.ssid].htmode.add(
						radio.config.htmode
					);
					wifiInterfacesMerged[radioInterface.iwinfo.ssid].txpower.add(
						radioInterface.iwinfo.txpower
					);
				}
				if (!radio.interfaces || radio.interfaces.length === 0) {
					continue;
				}
				if (!allIfname[router.routerIP]) {
					allIfname[router.routerIP] = [];
				}
				allIfname[router.routerIP].push(radio.interfaces[0].ifname);
			}
		})
	);

	return {
		success: true,
		data: {
			wifiInterfacesMerged,
			allIfname,
			wifiInterfaces
		}
	} as const;
}

export async function getWifiClients() {
	const wifiUsers: {
		[key: string]: WifiClients['result'][1]['results'][0] & {
			ip: string;
		};
	} = {};

	const wifiAPs = await getWifiAPs();
	if (!wifiAPs.success) {
		console.log('[ERROR] getWifiAPs threw an error', {
			wifiAPs
		});
		return {
			success: false,
			error: wifiAPs.error
		} as const;
	}
	await Promise.all(
		Object.keys(wifiAPs.data.allIfname).map(async (router) => {
			const allifname = wifiAPs.data.allIfname[router];
			for (const ifname of allifname) {
				const ubusResponse = await ubusCall({
					routerIP: router,
					params: ['iwinfo', 'assoclist', { device: ifname }]
				});
				if (!ubusResponse.success) {
					continue;
				}
				const parsedUbusResponse = wifiClientsSchema.safeParse(
					ubusResponse.data
				);
				if (!parsedUbusResponse.success) {
					console.log(
						'[ERROR] Failed to parse ubus response from wifiClients',
						{
							routerIP: router,
							error: parsedUbusResponse.error
						}
					);
					continue;
				}
				const wifiClients = parsedUbusResponse.data.result[1].results;
				for (const client of wifiClients) {
					wifiUsers[client.mac] = {
						...client,
						ip: router
					};
				}
			}
		})
	);

	return {
		success: true,
		data: wifiUsers
	};
}

export async function disableWifiAP({
	routerIP,
	configSection
}: {
	routerIP: string;
	configSection: string;
}) {
	const router = await getRouter(routerIP);
	if (!router.success) {
		return router;
	}

	const ubusResponse = await ubusCall({
		routerIP: router.data.routerIP,
		params: [
			'uci',
			'set',
			{
				config: 'wireless',
				section: configSection,
				values: {
					disabled: '1'
				}
			}
		]
	});

	if (!ubusResponse.success) {
		console.log('[ERROR] ubus call to disable wifi AP threw an error', {
			routerIP: router.data.routerIP,
			error: ubusResponse.error
		});
		return {
			success: false,
			error: ubusResponse.error
		} as const;
	}

	const confirmResponse = await ubusCall({
		routerIP: router.data.routerIP,
		params: [
			'uci',
			'commit',
			{
				config: 'wireless'
			}
		]
	});

	if (!confirmResponse.success) {
		console.log('[ERROR] ubus call to commit wifi AP disable threw an error', {
			routerIP: router.data.routerIP,
			error: confirmResponse.error
		});
		return {
			success: false,
			error: confirmResponse.error
		} as const;
	}

	return {
		success: true,
		data: ubusResponse.data
	} as const;
}

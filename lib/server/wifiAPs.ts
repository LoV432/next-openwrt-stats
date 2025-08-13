'use server';

import { getRouters } from './routerDB';
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

	const wifiInterfacesMerged: {
		[key: string]: {
			ip: Set<string>;
			channel: Set<number>;
			band: Set<string>;
			htmode: Set<string>;
			txpower: Set<number>;
		};
	} = {};

	const allIfname: { [key: string]: string[] } = {};

	for (const router of allRouters.data) {
		const ubusResponse = await ubusCall({
			routerIP: router.routerIP,
			params: ['luci-rpc', 'getWirelessDevices', {}]
		});
		if (!ubusResponse.success) {
			console.log('[ERROR] ubus call to get wifi APs threw an error', {
				routerIP: router.routerIP,
				error: ubusResponse.error
			});
			return {
				success: false,
				error: ubusResponse.error
			} as const;
		}
		const parsedUbusResponse = wifiAPsSchema.safeParse(ubusResponse.data);
		if (parsedUbusResponse.success) {
			for (const radio of Object.values(parsedUbusResponse.data.result[1])) {
				for (const radioInterface of radio.interfaces) {
					if (!wifiInterfacesMerged[radioInterface.iwinfo.ssid]) {
						wifiInterfacesMerged[radioInterface.iwinfo.ssid] = {
							ip: new Set(),
							channel: new Set(),
							band: new Set(),
							htmode: new Set(),
							txpower: new Set()
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
				const ifname = radio.interfaces[0].ifname;
				if (!allIfname[router.routerIP]) {
					allIfname[router.routerIP] = [];
				}
				allIfname[router.routerIP].push(ifname);
			}
		}
	}
	return {
		success: true,
		data: {
			wifiInterfaces: wifiInterfacesMerged,
			allIfname
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
	for (const router of Object.keys(wifiAPs.data.allIfname)) {
		const allifname = wifiAPs.data.allIfname[router];
		for (const ifname of allifname) {
			const ubusResponse = await ubusCall({
				routerIP: router,
				params: ['iwinfo', 'assoclist', { device: ifname }]
			});
			if (!ubusResponse.success) {
				return {
					success: false,
					error: ubusResponse.error
				} as const;
			}
			const parsedUbusResponse = wifiClientsSchema.safeParse(ubusResponse.data);
			if (!parsedUbusResponse.success) {
				console.log('[ERROR] Failed to parse ubus response from wifiClients', {
					routerIP: router,
					error: parsedUbusResponse.error
				});
				return {
					success: false,
					error: 'Failed to parse ubus response from wifiClients'
				} as const;
			}
			const wifiClients = parsedUbusResponse.data.result[1].results;
			for (const client of wifiClients) {
				wifiUsers[client.mac] = {
					...client,
					ip: router
				};
			}
		}
	}
	return {
		success: true,
		data: wifiUsers
	};
}

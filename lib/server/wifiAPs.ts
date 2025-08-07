'use server';

import { routersTable } from '@/db/schema';
import { db } from './dbDriver';
import { ubusCall } from './ubusCalls';
import { wifiAPsSchema } from '@/types/ubusCalls';

export async function getWifiAPs() {
	const allRouters = await db
		.select({ routerIP: routersTable.routerIP })
		.from(routersTable);
	if (!allRouters.length) {
		return {
			success: false,
			error: 'No routers found'
		} as const;
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

	for (const router of allRouters) {
		const ubusResponse = await ubusCall({
			routerIP: router.routerIP,
			params: ['luci-rpc', 'getWirelessDevices', {}]
		});
		if (!ubusResponse.success) {
			return {
				success: false,
				error: ubusResponse.error
			} as const;
		}
		const parsedUbusResponse = wifiAPsSchema.safeParse(ubusResponse.data);
		if (!parsedUbusResponse.success) {
			return {
				success: false,
				error: 'Failed to parse ubus response from wifiAPs'
			} as const;
		}
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
	return {
		success: true,
		data: wifiInterfacesMerged
	} as const;
}

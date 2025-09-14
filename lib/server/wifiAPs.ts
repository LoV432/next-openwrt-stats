'use server';

import { getRouter, getRouters } from './routerDB';
import { ubusCall } from './ubusCalls';
import {
	wifiAPsLiveDataSchema,
	WifiClients,
	wifiClientsSchema,
	wifiConfigSchema
} from '@/types/ubusCalls';

export async function getWifiAPs() {
	const allRouters = await getRouters();
	if (!allRouters.success) {
		return allRouters;
	}

	const wifiAPsPerSSID: {
		[key: string]: {
			configSection: string;
			parentConfigSection: string;
			ip: string;
			channel: number;
			band: string;
			htmode: string;
			txpower: number;
			bitrate?: number;
			disabled?: boolean;
		}[];
	} = {};

	const wifiAPsOverview: {
		// This is the overview of all wifi APs with the same SSID
		// Something like this:
		// {
		//   "SSID": [
		//     {
		//       "ip": ["192.168.1.1", "192.168.1.2", "192.168.1.3"],
		//       "channel": [1, 5, 14]
		//     }
		//   ]
		// }
		[key: string]: {
			ip: Set<string>;
			channel: Set<number>;
			band: Set<string>;
			htmode: Set<string>;
			txpower: Set<number>;
			bitrate: Set<number>;
			disabled: Set<boolean>;
		};
	} = {};

	const allIfname: { [key: string]: string[] } = {};

	await Promise.all(
		allRouters.data.map(async (router) => {
			const [getWifiConfigs, getWifiAPsLiveData] = await Promise.all([
				// I need the wireless config to get disabled APs
				// Then to get accruate data of APS i need to get the live data
				ubusCall({
					routerIP: router.routerIP,
					params: ['uci', 'get', { config: 'wireless' }]
				}),
				ubusCall({
					routerIP: router.routerIP,
					params: ['luci-rpc', 'getWirelessDevices', {}]
				})
			]);
			if (!getWifiConfigs.success) {
				console.log('[ERROR] ubus call to get wirelessConfig threw an error', {
					routerIP: router.routerIP,
					error: getWifiConfigs.error
				});
				return;
			}
			const wirelessConfig = wifiConfigSchema.safeParse(getWifiConfigs.data);
			if (!wirelessConfig.success) {
				console.log(
					'[ERROR] Failed to parse ubus response from wirelessConfig',
					{
						routerIP: router.routerIP,
						error: wirelessConfig.error
					}
				);
				return;
			}
			if (!getWifiAPsLiveData.success) {
				console.log('[ERROR] ubus call to get wifi APs threw an error', {
					routerIP: router.routerIP,
					error: getWifiAPsLiveData.error
				});
				return;
			}
			const wifiAPsData = wifiAPsLiveDataSchema.safeParse(
				getWifiAPsLiveData.data
			);
			if (!wifiAPsData.success) {
				console.log('[ERROR] Failed to parse ubus response from wifiAPs', {
					routerIP: router.routerIP,
					error: wifiAPsData.error
				});
				return;
			}
			for (const radio of Object.values(wirelessConfig.data.result[1])) {
				for (const wifiConfig of Object.values(radio)) {
					if (wifiConfig['.type'] !== 'wifi-iface') {
						continue;
					}
					const wifiConfigParent = radio[wifiConfig.device];
					if (
						!wifiConfigParent ||
						wifiConfigParent['.type'] !== 'wifi-device'
					) {
						continue;
					}
					if (!wifiAPsPerSSID[wifiConfig.ssid]) {
						wifiAPsPerSSID[wifiConfig.ssid] = [];
					}
					const wifiLiveData = wifiAPsData.data.result[1][
						wifiConfig.device
					].interfaces?.find((iface) => iface.section === wifiConfig['.name']);
					wifiAPsPerSSID[wifiConfig.ssid].push({
						configSection: wifiConfig['.name'],
						parentConfigSection: wifiConfig.device,
						ip: router.routerIP,
						channel:
							wifiLiveData?.iwinfo?.channel ||
							Number(wifiConfigParent.channel) ||
							0,
						band: wifiConfigParent.band,
						htmode: wifiConfigParent.htmode,
						txpower:
							wifiLiveData?.iwinfo?.txpower ||
							Number(wifiConfigParent.txpower) ||
							0,
						bitrate: wifiLiveData?.iwinfo?.bitrate || 0,
						disabled:
							wifiConfigParent.disabled === '1' || wifiConfig.disabled === '1'
								? true
								: false
					});
					if (!wifiAPsOverview[wifiConfig.ssid]) {
						wifiAPsOverview[wifiConfig.ssid] = {
							ip: new Set(),
							channel: new Set(),
							band: new Set(),
							htmode: new Set(),
							txpower: new Set(),
							bitrate: new Set(),
							disabled: new Set()
						};
					}
					wifiAPsOverview[wifiConfig.ssid].ip.add(router.routerIP);
					wifiAPsOverview[wifiConfig.ssid].channel.add(
						wifiLiveData?.iwinfo?.channel ||
							Number(wifiConfigParent.channel) ||
							0
					);
					wifiAPsOverview[wifiConfig.ssid].band.add(wifiConfigParent.band);
					wifiAPsOverview[wifiConfig.ssid].htmode.add(wifiConfigParent.htmode);
					wifiAPsOverview[wifiConfig.ssid].txpower.add(
						wifiLiveData?.iwinfo?.txpower ||
							Number(wifiConfigParent.txpower) ||
							0
					);
					wifiAPsOverview[wifiConfig.ssid].disabled.add(
						wifiConfigParent.disabled === '1' || wifiConfig.disabled === '1'
							? true
							: false
					);
					if (!allIfname[router.routerIP]) {
						allIfname[router.routerIP] = [];
					}
					if (wifiLiveData?.ifname)
						allIfname[router.routerIP].push(wifiLiveData.ifname);
				}
			}
		})
	);

	return {
		success: true,
		data: {
			wifiAPsOverview,
			allIfname,
			wifiAPsPerSSID
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

export async function enabledWifiAP({
	routerIP,
	configSection
}: {
	routerIP: string;
	configSection: string[];
}) {
	const router = await getRouter(routerIP);
	if (!router.success) {
		return router;
	}

	const [delte1, delete2] = await Promise.all([
		ubusCall({
			routerIP: router.data.routerIP,
			params: [
				'uci',
				'delete',
				{
					config: 'wireless',
					section: configSection[0],
					options: ['disabled']
				}
			]
		}),
		ubusCall({
			routerIP: router.data.routerIP,
			params: [
				'uci',
				'delete',
				{
					config: 'wireless',
					section: configSection[1],
					options: ['disabled']
				}
			]
		})
	]);

	if (!delte1.success || !delete2.success) {
		console.log('[ERROR] ubus call to enable wifi AP threw an error', {
			routerIP: router.data.routerIP,
			error: [delte1.error, delete2.error]
		});
		return {
			success: false,
			error: [delte1.error, delete2.error]
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
		console.log('[ERROR] ubus call to commit wifi AP enable threw an error', {
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
		data: [delte1.data, delete2.data, confirmResponse.data]
	} as const;
}

import 'server-only';
import { getRouters } from './router';
import { ubusCall } from './ubusCalls';
import {
	wifiAPsLiveDataSchema,
	WifiClientsType,
	wifiClientsSchema,
	wifiConfigSchema
} from '@/types/ubusCalls';

export type WifiAPs = Awaited<ReturnType<typeof getWifiAPs>>;
export async function getWifiAPs() {
	const allRouters = await getRouters();
	if (!allRouters.success) {
		return allRouters;
	}

	let wifiAPsPerSSID: {
		[key: string]: {
			configSection: string;
			parentConfigSection: string;
			displayName: string;
			channel: number;
			band: string;
			htmode: string;
			txpower: number;
			bitrate?: number;
			disabled?: boolean;
		}[];
	} = {};

	let wifiAPsOverview: {
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
			displayName: Set<string>;
			channel: Set<number>;
			band: Set<string>;
			htmode: Set<string>;
			txpower: Set<number>;
			bitrate: Set<number>;
		};
	} = {};

	const allIfname: {
		[key: string]: {
			ifname: string;
			ssid: string;
			band: string;
		}[];
	} = {};

	await Promise.all(
		allRouters.data.map(async (router) => {
			const [getWifiConfigs, getWifiAPsLiveData] = await Promise.all([
				// I need the wireless config to get disabled APs
				// Then to get accruate data of APS i need to get the live data
				ubusCall({
					displayName: router.displayName,
					params: ['uci', 'get', { config: 'wireless' }]
				}),
				ubusCall({
					displayName: router.displayName,
					params: ['luci-rpc', 'getWirelessDevices', {}]
				})
			]);
			if (!getWifiConfigs.success) {
				return;
			}
			const wirelessConfig = wifiConfigSchema.safeParse(getWifiConfigs.data);
			if (!wirelessConfig.success) {
				console.log(
					'[ERROR] Failed to parse ubus response from wirelessConfig',
					{
						displayName: router.displayName,
						error: wirelessConfig.error
					}
				);
				return;
			}
			if (!getWifiAPsLiveData.success) {
				return;
			}
			const wifiAPsData = wifiAPsLiveDataSchema.safeParse(
				getWifiAPsLiveData.data
			);
			if (!wifiAPsData.success) {
				console.log('[ERROR] Failed to parse ubus response from wifiAPs', {
					displayName: router.displayName,
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
						displayName: router.displayName,
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
							displayName: new Set(),
							channel: new Set(),
							band: new Set(),
							htmode: new Set(),
							txpower: new Set(),
							bitrate: new Set()
						};
					}
					wifiAPsOverview[wifiConfig.ssid].displayName.add(router.displayName);
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
					wifiAPsOverview[wifiConfig.ssid].bitrate.add(
						wifiLiveData?.iwinfo?.bitrate || 0
					);
					if (!allIfname[router.displayName]) {
						allIfname[router.displayName] = [];
					}
					if (wifiLiveData?.ifname)
						allIfname[router.displayName].push({
							ifname: wifiLiveData.ifname,
							ssid: wifiConfig.ssid,
							band: wifiConfigParent.band
						});
				}
			}
		})
	);

	const wifiAPsOverviewFinal: {
		// Sets are not JSON serializable
		// So we convert them to arrays
		[key: string]: {
			displayName: string[];
			channel: number[];
			band: string[];
			htmode: string[];
			txpower: number[];
			bitrate: number[];
		};
	} = {};
	for (const ssid of Object.keys(wifiAPsOverview).sort()) {
		const entry = wifiAPsOverview[ssid];
		wifiAPsOverviewFinal[ssid] = {
			displayName: Array.from(entry.displayName).sort(),
			channel: Array.from(entry.channel).sort((a, b) => a - b),
			band: Array.from(entry.band).sort(),
			htmode: Array.from(entry.htmode).sort(),
			txpower: Array.from(entry.txpower).sort((a, b) => a - b),
			bitrate: Array.from(entry.bitrate).sort((a, b) => a - b).filter((value) => value !== 0)
		};
	}

	wifiAPsPerSSID = Object.keys(wifiAPsPerSSID)
		.sort()
		.reduce((obj: any, key) => {
			// TODO: This seems to sort the IPs correctly but what about sorting with the bands as well?
			obj[key] = wifiAPsPerSSID[key].sort((a, b) =>
				a.displayName.localeCompare(b.displayName)
			);
			return obj;
		}, {});

	return {
		success: true,
		data: {
			wifiAPsOverview: wifiAPsOverviewFinal,
			allIfname,
			wifiAPsPerSSID
		}
	} as const;
}

export type WifiClients = Awaited<ReturnType<typeof getWifiClients>>;
export async function getWifiClients() {
	const wifiUsers: {
		[key: string]: WifiClientsType['result'][1]['results'][0] & {
			displayName: string;
			ssid: string;
			band: string;
		};
	} = {};

	const wifiAPs = await getWifiAPs();
	if (!wifiAPs.success) {
		return {
			success: false,
			error:
				'Something went wrong while getting the wifi clients. Please see logs for more details'
		} as const;
	}
	await Promise.all(
		Object.keys(wifiAPs.data.allIfname).map(async (router) => {
			const allifname = wifiAPs.data.allIfname[router];
			for (const ifname of allifname) {
				const ubusResponse = await ubusCall({
					displayName: router,
					params: ['iwinfo', 'assoclist', { device: ifname.ifname }]
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
							displayName: router,
							error: parsedUbusResponse.error
						}
					);
					continue;
				}
				const wifiClients = parsedUbusResponse.data.result[1].results;
				for (const client of wifiClients) {
					wifiUsers[client.mac] = {
						...client,
						displayName: router,
						ssid: ifname.ssid,
						band: ifname.band
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

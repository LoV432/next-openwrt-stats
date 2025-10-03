import 'server-only';
import { getRouters } from './router';
import { ubusBatchCall, ubusCall } from './ubusCalls';
import {
	wifiAPsLiveDataSchema,
	wifiClientsSchema,
	wifiConfigSchema,
	wifiHostapdClientsSchema
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
			const wifiAPsLiveData = wifiAPsLiveDataSchema.safeParse(
				getWifiAPsLiveData.data
			);
			if (!wifiAPsLiveData.success) {
				console.log('[ERROR] Failed to parse ubus response from wifiAPs', {
					displayName: router.displayName,
					error: wifiAPsLiveData.error
				});
				return;
			}
			const allWifiConfigs = Object.values(
				wirelessConfig.data.result[1].values
			);
			for (const wifiConfig of allWifiConfigs) {
				if (wifiConfig['.type'] !== 'wifi-iface') {
					continue;
				}
				const wifiConfigParent = allWifiConfigs.find(
					(config) => wifiConfig.device === config['.name']
				);
				if (!wifiConfigParent || wifiConfigParent['.type'] !== 'wifi-device') {
					continue;
				}
				if (!wifiAPsPerSSID[wifiConfig.ssid]) {
					wifiAPsPerSSID[wifiConfig.ssid] = [];
				}
				const wifiAPLiveData = wifiAPsLiveData.data.result[1][
					wifiConfig.device
				].interfaces?.find((iface) => iface.section === wifiConfig['.name']);
				wifiAPsPerSSID[wifiConfig.ssid].push({
					configSection: wifiConfig['.name'],
					parentConfigSection: wifiConfig.device,
					displayName: router.displayName,
					channel:
						wifiAPLiveData?.iwinfo?.channel ||
						Number(wifiConfigParent.channel) ||
						0,
					band: wifiConfigParent.band,
					htmode: wifiConfigParent.htmode,
					txpower:
						wifiAPLiveData?.iwinfo?.txpower ||
						Number(wifiConfigParent.txpower) ||
						0,
					bitrate: wifiAPLiveData?.iwinfo?.bitrate || 0,
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
					wifiAPLiveData?.iwinfo?.channel ||
						Number(wifiConfigParent.channel) ||
						0
				);
				wifiAPsOverview[wifiConfig.ssid].band.add(wifiConfigParent.band);
				wifiAPsOverview[wifiConfig.ssid].htmode.add(wifiConfigParent.htmode);
				wifiAPsOverview[wifiConfig.ssid].txpower.add(
					wifiAPLiveData?.iwinfo?.txpower ||
						Number(wifiConfigParent.txpower) ||
						0
				);
				wifiAPsOverview[wifiConfig.ssid].bitrate.add(
					wifiAPLiveData?.iwinfo?.bitrate || 0
				);
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
			bitrate: Array.from(entry.bitrate)
				.sort((a, b) => a - b)
				.filter((value) => value !== 0)
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
			wifiAPsPerSSID
		}
	} as const;
}

async function getWifiAPsIfname() {
	const allRouters = await getRouters();
	if (!allRouters.success) {
		return {
			success: false,
			error: allRouters.error
		} as const;
	}
	const wifiAPsIfname: {
		[key: string]: {
			ifname: string;
			ssid: string;
			band: string;
		}[];
	} = {};
	await Promise.all(
		allRouters.data.map(async (router) => {
			const wifiData = await ubusCall({
				displayName: router.displayName,
				params: ['luci-rpc', 'getWirelessDevices', {}]
			});
			if (!wifiData.success) {
				return;
			}
			const wifiDevices = wifiAPsLiveDataSchema.safeParse(wifiData.data);
			if (!wifiDevices.success) {
				console.log('[ERROR] Failed to parse ubus response from wifiDevices', {
					displayName: router.displayName,
					error: wifiDevices.error
				});
				return;
			}
			for (const wifiDevice of Object.values(wifiDevices.data.result[1])) {
				wifiDevice.interfaces?.forEach((iface) => {
					if (!wifiAPsIfname[router.displayName]) {
						wifiAPsIfname[router.displayName] = [];
					}
					wifiAPsIfname[router.displayName].push({
						ifname: iface.ifname || '',
						ssid: iface.iwinfo?.ssid || '',
						band: wifiDevice.config.band || ''
					});
				});
			}
		})
	);
	return {
		success: true,
		data: wifiAPsIfname
	} as const;
}

export type WifiClients = Awaited<ReturnType<typeof getWifiClients>>;
export async function getWifiClients() {
	const wifiUsers: {
		[key: string]: {
			displayName: string;
			ssid: string;
			band: string;
			mac: string;
			rx: {
				packets: number;
				bytes: number;
			};
			tx: {
				packets: number;
				bytes: number;
			};
			signal: number;
			noise?: number;
			connected_time?: number;
		};
	} = {};

	const wifiAPsIfname = await getWifiAPsIfname();
	if (!wifiAPsIfname.success) {
		return {
			success: false,
			error:
				'Something went wrong while getting the wifi clients. Please see logs for more details'
		} as const;
	}
	await Promise.all(
		Object.keys(wifiAPsIfname.data).map(async (router) => {
			const allifname = wifiAPsIfname.data[router];
			for (const ifname of allifname) {
				const ubusResponse = await ubusBatchCall({
					displayName: router,
					calls: [
						{
							id: 1,
							params: ['iwinfo', 'assoclist', { device: ifname.ifname }]
						},
						{ id: 2, params: [`hostapd.${ifname.ifname}`, 'get_clients', {}] }
					]
				});
				if (!ubusResponse.success) {
					continue;
				}
				const parsedClientsResponse = wifiClientsSchema.safeParse(
					ubusResponse.data.find((response) => response.id === 1)
				);
				const parsedHostapdResponse = wifiHostapdClientsSchema.safeParse(
					ubusResponse.data.find((response) => response.id === 2)
				);
				if (!parsedClientsResponse.success || !parsedHostapdResponse.success) {
					console.log(
						'[ERROR] Failed to parse ubus response from wifiClients',
						{
							displayName: router,
							error: [parsedClientsResponse.error, parsedHostapdResponse.error]
						}
					);
					continue;
				}
				const wifiClients = parsedClientsResponse.data.result[1].results;
				for (const client of wifiClients) {
					wifiUsers[client.mac.toUpperCase()] = {
						...client,
						displayName: router,
						ssid: ifname.ssid,
						band: ifname.band,
						mac: client.mac.toUpperCase()
					};
				}
				const hostapdClients = Object.keys(
					parsedHostapdResponse.data.result[1].clients
				).map((key) => {
					if (wifiUsers[key.toUpperCase()]) {
						return null;
					}
					return {
						...parsedHostapdResponse.data.result[1].clients[key],
						displayName: router,
						ssid: ifname.ssid,
						band: ifname.band,
						mac: key.toUpperCase(),
						rx: {
							packets:
								parsedHostapdResponse.data.result[1].clients[key].packets.rx,
							bytes: parsedHostapdResponse.data.result[1].clients[key].bytes.rx
						},
						tx: {
							packets:
								parsedHostapdResponse.data.result[1].clients[key].packets.tx,
							bytes: parsedHostapdResponse.data.result[1].clients[key].bytes.tx
						}
					};
				});
				for (const client of hostapdClients) {
					if (!client) {
						continue;
					}
					wifiUsers[client.mac.toUpperCase()] = {
						...client
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

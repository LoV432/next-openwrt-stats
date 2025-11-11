import 'server-only';
import { getRouters } from './router';
import { ubusBatchCall } from './ubusCalls';
import {
	wifiAPsLiveDataSchema,
	wifiClientsSchema,
	wifiConfigSchema,
	wifiHostapdClientsSchema
} from '@/types/ubusCalls';
import { logError } from '../client/errorLog';

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

	const wifiAPsIfname: {
		[displayName: string]: {
			ifname: string;
			ssid: string;
			band: string;
		}[];
	} = {};

	await Promise.all(
		allRouters.data.map(async (router) => {
			const wifiData = await ubusBatchCall({
				displayName: router.displayName,
				calls: [
					{
						id: 1,
						params: ['uci', 'get', { config: 'wireless' }]
					},
					{
						id: 2,
						params: ['luci-rpc', 'getWirelessDevices', {}]
					}
				]
			});
			if (!wifiData.success) {
				logError({
					displayName: router.displayName,
					errorMessage: 'Failed to get wifi data',
					...wifiData
				});
				return;
			}
			const wirelessConfig = wifiConfigSchema.safeParse(
				wifiData.data.find((response) => response.id === 1)
			);
			const wifiAPsLiveData = wifiAPsLiveDataSchema.safeParse(
				wifiData.data.find((response) => response.id === 2)
			);
			if (!wirelessConfig.success || !wifiAPsLiveData.success) {
				!wirelessConfig.success &&
					logError({
						displayName: router.displayName,
						errorMessage: 'Failed to parse wireless config',
						zodError: wirelessConfig.error,
						...wifiData
					});
				!wifiAPsLiveData.success &&
					logError({
						displayName: router.displayName,
						errorMessage: 'Failed to parse wifi APs live data',
						zodError: wifiAPsLiveData.error,
						...wifiData
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
				if (!wifiAPsIfname[router.displayName]) {
					wifiAPsIfname[router.displayName] = [];
				}
				if (wifiAPLiveData?.ifname) {
					wifiAPsIfname[router.displayName].push({
						ssid: wifiConfig.ssid,
						band: wifiConfigParent.band,
						ifname: wifiAPLiveData.ifname
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
			wifiAPsPerSSID,
			wifiAPsIfname
		}
	} as const;
}

export type WifiClients = Awaited<ReturnType<typeof getWifiClients>>;
export async function getWifiClients(ifnames: {
	[key: string]: {
		ifname: string;
		ssid: string;
		band: string;
	}[];
}) {
	if (!ifnames) {
		return {
			success: false,
			errorMessage: 'No ifnames provided'
		} as const;
	}
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
	await Promise.all(
		Object.keys(ifnames).map(async (router) => {
			const allifname = ifnames[router];
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
					logError({
						displayName: router,
						errorMessage: 'Failed to get iwinfo or hostapd data',
						...ubusResponse
					});
					continue;
				}
				const assoclistResponse = wifiClientsSchema.safeParse(
					ubusResponse.data.find((response) => response.id === 1)
				);
				const hostapdResponse = wifiHostapdClientsSchema.safeParse(
					ubusResponse.data.find((response) => response.id === 2)
				);
				if (!assoclistResponse.success && !hostapdResponse.success) {
					logError({
						displayName: router,
						errorMessage: 'Failed to parse iwinfo or hostapd data',
						zodErrors: [assoclistResponse.error, hostapdResponse.error],
						...ubusResponse
					});
					continue;
				}
				if (assoclistResponse.success) {
					const wifiClients = assoclistResponse.data.result[1].results;
					for (const client of wifiClients) {
						wifiUsers[client.mac.toUpperCase()] = {
							...client,
							displayName: router,
							ssid: ifname.ssid,
							band: ifname.band,
							mac: client.mac.toUpperCase()
						};
					}
				}
				if (hostapdResponse.success) {
					const hostapdClients = Object.keys(
						hostapdResponse.data.result[1].clients
					).map((key) => {
						if (wifiUsers[key.toUpperCase()]) {
							return null;
						}
						const client = hostapdResponse.data.result[1].clients[key];
						return {
							signal: client.signal || 0,
							displayName: router,
							ssid: ifname.ssid,
							band: ifname.band,
							mac: key.toUpperCase(),
							rx: {
								packets: client.packets?.rx || 0,
								bytes: client.bytes?.rx || 0
							},
							tx: {
								packets: client.packets?.tx || 0,
								bytes: client.bytes?.tx || 0
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
			}
		})
	);

	return {
		success: true,
		data: wifiUsers
	};
}

export type WifiClientsTraffic = Awaited<
	ReturnType<typeof getWifiClientsTraffic>
>;
export async function getWifiClientsTraffic(ifnames: {
	[key: string]: {
		ifname: string;
		ssid: string;
		band: string;
	}[];
}) {
	try {
		const trafficStats: {
			[key: string]: {
				rxBytes: number;
				txBytes: number;
				time: number;
			};
		} = {};

		await Promise.all(
			Object.keys(ifnames).map(async (router) => {
				const allifname = ifnames[router];
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
						logError({
							displayName: router,
							errorMessage: 'Failed to get iwinfo or hostapd data',
							...ubusResponse
						});
						continue;
					}
					const parsedClientsResponse = wifiClientsSchema.safeParse(
						ubusResponse.data.find((response) => response.id === 1)
					);
					const parsedHostapdResponse = wifiHostapdClientsSchema.safeParse(
						ubusResponse.data.find((response) => response.id === 2)
					);
					if (
						!parsedClientsResponse.success &&
						!parsedHostapdResponse.success
					) {
						logError({
							displayName: router,
							errorMessage: 'Failed to parse iwinfo or hostapd data',
							zodErrors: [
								parsedClientsResponse.error,
								parsedHostapdResponse.error
							],
							...ubusResponse
						});
						continue;
					}
					if (parsedClientsResponse.success) {
						const wifiClients = parsedClientsResponse.data.result[1].results;
						for (const client of wifiClients) {
							trafficStats[client.mac.toUpperCase()] = {
								rxBytes: client.rx.bytes,
								txBytes: client.tx.bytes,
								time: Date.now() / 1000
							};
						}
					}

					if (parsedHostapdResponse.success) {
						const hostapdClients = Object.keys(
							parsedHostapdResponse.data.result[1].clients
						).map((key) => {
							if (trafficStats[key.toUpperCase()]) {
								return null;
							}
							const client = parsedHostapdResponse.data.result[1].clients[key];
							if (!client.bytes) {
								return null;
							}
							return {
								rxBytes: client.bytes.rx,
								txBytes: client.bytes.tx,
								time: Date.now() / 1000,
								mac: key.toUpperCase()
							};
						});
						for (const client of hostapdClients) {
							if (!client) {
								continue;
							}
							trafficStats[client.mac.toUpperCase()] = {
								...client
							};
						}
					}
				}
			})
		);

		return {
			success: true,
			data: trafficStats
		} as const;
	} catch (error) {
		console.error(error);
		return {
			success: false,
			errorMessage:
				'Something went wrong while getting the wifi clients. Please see logs for more details'
		} as const;
	}
}

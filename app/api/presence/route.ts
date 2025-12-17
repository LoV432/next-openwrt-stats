import { db } from '@/lib/server/dbDriver';
import {
	clientsTable,
	eventTypeIdMap,
	presencesEventTable,
	prevClientsTable,
	wifisTable
} from '@/drizzle/schema/schema';
import { getWifiClients, WifiClients } from '@/lib/server/wifiAPs';
import { and, eq } from 'drizzle-orm';
import { DhcpDevices, getDhcpDevices } from '@/lib/server/dhcpDevices';
import { getRouters } from '@/lib/server/router';
import { ubusCall } from '@/lib/server/ubusCalls';
import { wifiAPsLiveDataSchema } from '@/types/ubusCalls';
import { logError } from '@/lib/client/errorLog';
export const dynamic = 'force-dynamic';

type PresenceEvent = {
	timestamp: number;
	clientId: number;
	eventType: (typeof eventTypeIdMap)[keyof typeof eventTypeIdMap];
	fromWifiId?: number;
	toWifiId?: number;
};

let dhcpClientsCache: Exclude<DhcpDevices['data'], undefined> = [];

let prevClients: Exclude<WifiClients['data'], undefined> = {};
let dbPrevClients: {
	id: number;
	data: string;
}[] = [];

try {
	dbPrevClients = await db
		.select()
		.from(prevClientsTable)
		.where(eq(prevClientsTable.id, 1));
	if (dbPrevClients.length > 0) {
		prevClients = JSON.parse(dbPrevClients[0].data);
	} else {
		await db.insert(prevClientsTable).values({
			id: 1,
			data: JSON.stringify({})
		});
	}
} catch (error) {}

export async function GET() {
	if (process.env.PRESENCE_ENABLED !== 'true') {
		return new Response('Not enabled', { status: 500 });
	}
	const wifiIfnames = await getIfnames();
	if (!wifiIfnames.success) {
		return new Response(
			JSON.stringify({
				success: false,
				errorMessage: wifiIfnames.errorMessage
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}
	const allClients = await getWifiClients(wifiIfnames.data);
	if (!allClients.success) {
		return new Response(
			JSON.stringify({
				success: false,
				errorMessage: 'Failed to get wifi clients'
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}
	await Promise.all(
		Object.values(allClients.data).map(async (client) => {
			const prevClient = prevClients[client.mac];
			if (!prevClient) {
				const clientId = await getClientDB({ clientMacAddress: client.mac });
				const wifiId = await getWifiDB({
					displayName: client.displayName,
					ssid: client.ssid,
					band: client.band
				});
				await addEventToDB({
					timestamp: Date.now(),
					clientId: clientId[0].id,
					eventType: eventTypeIdMap.client_connected,
					toWifiId: wifiId[0].id
				});
				return;
			}
			if (clientNoUpdate(client, prevClient)) {
				return;
			}
			if (clientUpdated(client, prevClient)) {
				const clientId = await getClientDB({ clientMacAddress: client.mac });
				const fromWifiId = await getWifiDB({
					displayName: prevClient.displayName,
					ssid: prevClient.ssid,
					band: prevClient.band
				});
				const toWifiId = await getWifiDB({
					displayName: client.displayName,
					ssid: client.ssid,
					band: client.band
				});
				await addEventToDB({
					timestamp: Date.now(),
					clientId: clientId[0].id,
					eventType: eventTypeIdMap.client_updated,
					fromWifiId: fromWifiId[0].id,
					toWifiId: toWifiId[0].id
				});
				return;
			}
		})
	);
	const allClientsMac = Object.keys(allClients.data);
	const allPrevClientsMac = Object.keys(prevClients);
	await Promise.all(
		allPrevClientsMac.map(async (prevClientMac) => {
			if (!allClientsMac.includes(prevClientMac)) {
				const clientId = await getClientDB({
					clientMacAddress: prevClientMac
				});
				const fromWifiId = await getWifiDB({
					displayName: prevClients[prevClientMac].displayName,
					ssid: prevClients[prevClientMac].ssid,
					band: prevClients[prevClientMac].band
				});
				await addEventToDB({
					timestamp: Date.now(),
					clientId: clientId[0].id,
					eventType: eventTypeIdMap.client_disconnected,
					fromWifiId: fromWifiId[0].id
				});
				return;
			}
		})
	);
	await db
		.update(prevClientsTable)
		.set({ data: JSON.stringify(allClients.data) })
		.where(eq(prevClientsTable.id, 1));
	prevClients = allClients.data;
	return new Response(
		JSON.stringify({
			success: true
		}),
		{
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		}
	);
}

async function getIfnames() {
	try {
		const allRouters = await getRouters();
		if (!allRouters.success) {
			return allRouters;
		}
		let wifiIfnames: {
			[displayName: string]: {
				ifname: string;
				ssid: string;
				band: string;
			}[];
		} = {};

		await Promise.all(
			allRouters.data.map(async (router) => {
				const wifiAPsLiveData = await ubusCall({
					displayName: router.displayName,
					params: ['luci-rpc', 'getWirelessDevices', {}]
				});
				if (!wifiAPsLiveData.success) {
					logError({
						displayName: router.displayName,
						errorMessage:
							'Failed to get wifi devices during presence detection',
						...wifiAPsLiveData
					});
					return;
				}
				const wifiAPsLiveDataParsed = wifiAPsLiveDataSchema.safeParse(
					wifiAPsLiveData.data
				);
				if (!wifiAPsLiveDataParsed.success) {
					logError({
						displayName: router.displayName,
						zodError: wifiAPsLiveDataParsed.error,
						errorMessage:
							'Failed to parse wifi devices during presence detection',
						...wifiAPsLiveData
					});
					return;
				}

				const allWifisData = Object.values(
					wifiAPsLiveDataParsed.data.result[1]
				);
				for (const wifiData of allWifisData) {
					if (!wifiData.interfaces) {
						continue;
					}
					for (const wifiInterface of wifiData.interfaces) {
						if (
							!wifiInterface.ifname ||
							!wifiInterface.iwinfo ||
							!wifiInterface.iwinfo.ssid
						) {
							continue;
						}
						if (!wifiIfnames[router.displayName]) {
							wifiIfnames[router.displayName] = [];
						}
						wifiIfnames[router.displayName].push({
							ssid: wifiInterface.iwinfo.ssid,
							band: wifiData.config.band,
							ifname: wifiInterface.ifname
						});
					}
				}
			})
		);
		if (Math.random() < 0.1) {
			// Update the dhcp client cache about every 10% of the time
			// This is to help with client name changes
			updateDhcpClientCache();
		}
		return {
			success: true,
			data: wifiIfnames
		} as const;
	} catch (error) {
		logError({
			errorMessage:
				'Something went wrong while getting the wifi ifnames for presence detection',
			error
		});
		return {
			success: false,
			errorMessage:
				'Something went wrong while getting the wifi ifnames for presence detection. Please see logs for more details'
		} as const;
	}
}

type WifiClient = NonNullable<WifiClients['data']>[keyof NonNullable<
	WifiClients['data']
>];

function clientNoUpdate(client: WifiClient, prevClient: WifiClient) {
	return (
		prevClient &&
		prevClient.displayName === client.displayName &&
		prevClient.ssid === client.ssid &&
		prevClient.band === client.band
	);
}

function clientUpdated(client: WifiClient, prevClient: WifiClient) {
	return (
		prevClient &&
		(prevClient.displayName !== client.displayName ||
			prevClient.ssid !== client.ssid ||
			prevClient.band !== client.band)
	);
}

async function addEventToDB(event: PresenceEvent) {
	return await db.insert(presencesEventTable).values(event);
}

async function getClientDB({ clientMacAddress }: { clientMacAddress: string }) {
	const getClientId = await db
		.select({ id: clientsTable.id, clientName: clientsTable.clientName })
		.from(clientsTable)
		.where(eq(clientsTable.clientMacAddress, clientMacAddress));
	const checkDhcpClientCache = dhcpClientsCache.find(
		(client) => client.macAddress === clientMacAddress
	);
	if (getClientId.length === 0) {
		if (checkDhcpClientCache) {
			console.log(
				'[INFO] Presence event DHCP client found in cache. Saving....'
			);
			return await db
				.insert(clientsTable)
				.values({
					clientName: checkDhcpClientCache.deviceName,
					clientMacAddress: clientMacAddress
				})
				.returning();
		}
		const dhcpClients = await getDhcpDevices();
		if (!dhcpClients.success) {
			console.log(
				'[INFO] Presence event from unknown mac address. Saving as unknown.'
			);
			return await db
				.insert(clientsTable)
				.values({
					clientName: 'Unknown',
					clientMacAddress: clientMacAddress
				})
				.returning();
		}
		dhcpClientsCache = dhcpClients.data;
		const client = dhcpClientsCache.find(
			(client) => client.macAddress === clientMacAddress
		);
		if (!client) {
			console.log(
				'[INFO] Presence event from unknown mac address. Saving as unknown.'
			);
			return await db
				.insert(clientsTable)
				.values({
					clientName: 'Unknown',
					clientMacAddress: clientMacAddress
				})
				.returning();
		} else {
			return await db
				.insert(clientsTable)
				.values({
					clientName: client.deviceName,
					clientMacAddress: clientMacAddress
				})
				.returning();
		}
	}
	if (
		// Check if the client name has changed
		checkDhcpClientCache &&
		checkDhcpClientCache.deviceName !== getClientId[0].clientName &&
		checkDhcpClientCache.deviceName !== 'Unknown' &&
		checkDhcpClientCache.deviceName !== 'Unknown Device'
	) {
		console.log(
			`[INFO] Client name changed for ${getClientId[0].clientName}. Updating client name to ${checkDhcpClientCache.deviceName}`
		);
		await db
			.update(clientsTable)
			.set({ clientName: checkDhcpClientCache.deviceName })
			.where(eq(clientsTable.clientMacAddress, clientMacAddress));
	}
	return getClientId;
}

async function updateDhcpClientCache() {
	try {
		const newDhcpClientsCache = await getDhcpDevices();
		if (!newDhcpClientsCache.success) {
			return;
		}
		dhcpClientsCache = newDhcpClientsCache.data;
	} catch {}
}

async function getWifiDB({
	displayName,
	ssid,
	band
}: {
	displayName: string;
	ssid: string;
	band: string;
}) {
	const getWifiId = await db
		.select({ id: wifisTable.id })
		.from(wifisTable)
		.where(
			and(
				eq(wifisTable.displayName, displayName),
				eq(wifisTable.ssid, ssid),
				eq(wifisTable.band, band)
			)
		);
	if (getWifiId.length === 0) {
		return await db
			.insert(wifisTable)
			.values({
				displayName,
				ssid,
				band
			})
			.returning();
	}
	return getWifiId;
}

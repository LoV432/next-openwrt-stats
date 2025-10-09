import { db } from '@/lib/server/dbDriver';
import {
	clientsTable,
	presencesEventTable,
	prevClientsTable,
	wifisTable
} from '@/drizzle/schema/schema';
import { getWifiAPs, getWifiClients, WifiClients } from '@/lib/server/wifiAPs';
import { and, eq } from 'drizzle-orm';
import { DhcpDevices, getDhcpDevices } from '@/lib/server/dhcpDevices';
export const dynamic = 'force-dynamic';

type PresenceEvent = {
	timestamp: number;
	clientId: number;
	event: 'client-connected' | 'client-updated' | 'client-disconnected';
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
} catch (error) {}
if (dbPrevClients.length > 0) {
	prevClients = JSON.parse(dbPrevClients[0].data);
} else {
	await db.insert(prevClientsTable).values({
		id: 1,
		data: JSON.stringify({})
	});
}

export async function GET() {
	if (process.env.PRESENCE_ENABLED !== 'true') {
		return new Response('Not enabled', { status: 500 });
	}
	const wifiaps = await getWifiAPs();
	if (!wifiaps.success) {
		return new Response(
			JSON.stringify({
				success: false,
				error: wifiaps.error
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}
	const allClients = await getWifiClients(wifiaps.data.wifiAPsIfname);
	if (!allClients.success) {
		return new Response(
			JSON.stringify({
				success: false,
				error: allClients.error
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
				const clientId = await getClient({ clientMacAddress: client.mac });
				const wifiId = await getWifi({
					displayName: client.displayName,
					ssid: client.ssid,
					band: client.band
				});
				await addEventToDB({
					timestamp: Date.now(),
					clientId: clientId[0].id,
					event: 'client-connected',
					toWifiId: wifiId[0].id
				});
				return;
			}
			if (clientNoUpdate(client, prevClient)) {
				return;
			}
			if (clientUpdated(client, prevClient)) {
				const clientId = await getClient({ clientMacAddress: client.mac });
				const fromWifiId = await getWifi({
					displayName: prevClient.displayName,
					ssid: prevClient.ssid,
					band: prevClient.band
				});
				const toWifiId = await getWifi({
					displayName: client.displayName,
					ssid: client.ssid,
					band: client.band
				});
				await addEventToDB({
					timestamp: Date.now(),
					clientId: clientId[0].id,
					event: 'client-updated',
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
				const clientId = await getClient({
					clientMacAddress: prevClientMac
				});
				const fromWifiId = await getWifi({
					displayName: prevClients[prevClientMac].displayName,
					ssid: prevClients[prevClientMac].ssid,
					band: prevClients[prevClientMac].band
				});
				await addEventToDB({
					timestamp: Date.now(),
					clientId: clientId[0].id,
					event: 'client-disconnected',
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

async function getClient({ clientMacAddress }: { clientMacAddress: string }) {
	const getClientId = await db
		.select({ id: clientsTable.id })
		.from(clientsTable)
		.where(eq(clientsTable.clientMacAddress, clientMacAddress));
	if (getClientId.length === 0) {
		const checkDhcpClientCache = dhcpClientsCache.find(
			(client) => client.macAddress === clientMacAddress
		);
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
	return getClientId;
}

async function getWifi({
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

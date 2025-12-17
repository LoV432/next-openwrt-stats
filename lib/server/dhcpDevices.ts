import 'server-only';
import { ubusBatchCall, ubusCall } from './ubusCalls';
import { dhcpDevicesSchema } from '@/types/ubusCalls';
import { getRouters } from './router';
import { logError } from '../client/errorLog';

export type DhcpDevices = Awaited<ReturnType<typeof getDhcpDevices>>;
export async function getDhcpDevices() {
	const allRouters = await getRouters();
	if (!allRouters.success) {
		return {
			success: false,
			errorMessage: allRouters.errorMessage
		} as const;
	}
	const dhcpDevices: {
		deviceName: string;
		macAddress: string;
		ipAddress: string;
		leaseTime: number | boolean;
	}[] = [];
	await Promise.all(
		allRouters.data.map(async (router) => {
			const dhcpDevicesResponse = await ubusBatchCall({
				displayName: router.displayName,
				calls: [
					{ id: 1, params: ['luci-rpc', 'getDHCPLeases', {}] },
					{
						id: 2,
						params: [
							'uci',
							'get',
							{
								config: 'dhcp'
							}
						]
					}
				]
			});
			if (!dhcpDevicesResponse.success) {
				logError({
					displayName: router.displayName,
					errorMessage: 'Failed to get dhcp devices',
					...dhcpDevicesResponse
				});
				return;
			}
			const parsedDhcpDevicesResponse = dhcpDevicesSchema.safeParse(
				dhcpDevicesResponse.data.find((response) => response.id === 1)
			);
			if (!parsedDhcpDevicesResponse.success) {
				logError({
					displayName: router.displayName,
					errorMessage: 'Failed to parse dhcp devices response',
					zodError: parsedDhcpDevicesResponse.error,
					...dhcpDevicesResponse
				});
				return;
			}
			if (parsedDhcpDevicesResponse.data.result) {
				for (const device of parsedDhcpDevicesResponse.data.result[1]
					.dhcp_leases) {
					dhcpDevices.push({
						deviceName: device.hostname || 'Unknown Device',
						macAddress: device.macaddr.toUpperCase(),
						ipAddress: device.ipaddr,
						leaseTime: device.expires
					});
				}
			}
			try {
				// We don't want to crash the whole app in case something goes wrong with static leases
				// hence we're catching the error and just moving on
				const dhcpConfig = dhcpDevicesResponse.data.find(
					(response) => response.id === 2
				);
				if (!dhcpConfig || !dhcpConfig.success) {
					return;
				}
				const dhcpStaticLeases = Object.values(
					dhcpConfig?.result?.[1].values
				).filter((device: any) => device['.type'] === 'host') as {
					name: string;
					mac: string[];
					ip: string;
					leasetime: string;
				}[];
				const allMacsInDhcpDevices = dhcpDevices.map((device) =>
					device.macAddress.toUpperCase()
				);
				for (const device of dhcpStaticLeases) {
					if (allMacsInDhcpDevices.includes(device.mac[0].toUpperCase())) {
						continue;
					}
					dhcpDevices.push({
						deviceName: device.name || 'Unknown Device',
						macAddress: device.mac[0].toUpperCase(),
						ipAddress: device.ip,
						leaseTime: false
					});
				}
			} catch {}
		})
	);
	return {
		success: true,
		data: dhcpDevices.sort((a, b) => a.ipAddress.localeCompare(b.ipAddress))
	} as const;
}

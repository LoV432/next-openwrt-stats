import 'server-only';
import { ubusCall } from './ubusCalls';
import { dhcpDevicesSchema } from '@/types/ubusCalls';
import { getRouters } from './router';
import { logError } from '../client/errorLog';

export type DhcpDevices = Awaited<ReturnType<typeof getDhcpDevices>>;
export async function getDhcpDevices() {
	const allRouters = await getRouters();
	if (!allRouters.success) {
		return {
			success: false,
			error: allRouters.error
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
			const dhcpDevicesResponse = await ubusCall({
				displayName: router.displayName,
				params: ['luci-rpc', 'getDHCPLeases', {}]
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
				dhcpDevicesResponse.data
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
		})
	);
	return {
		success: true,
		data: dhcpDevices.sort((a, b) => a.ipAddress.localeCompare(b.ipAddress))
	} as const;
}

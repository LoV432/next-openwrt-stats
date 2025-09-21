'use server';
import 'server-only';
import { ubusCall } from './ubusCalls';
import { dhcpDevicesSchema } from '@/types/ubusCalls';
import { getRouters } from './router';

export type DhcpDevices = Awaited<ReturnType<typeof getDhcpDevicesAction>>;
export async function getDhcpDevicesAction() {
	const allRouters = await getRouters();
	if (!allRouters.success) {
		return {
			success: false,
			error: allRouters.error
		} as const;
	}
	const dhcpDevices: {
		[key: string]: {
			deviceName: string;
			macAddress: string;
			ipAddress: string;
			leaseTime: number | boolean;
		};
	} = {};
	await Promise.all(
		allRouters.data.map(async (router) => {
			const dhcpDevicesResponse = await ubusCall({
				displayName: router.displayName,
				params: ['luci-rpc', 'getDHCPLeases', {}]
			});
			if (!dhcpDevicesResponse.success) {
				return;
			}
			const parsedDhcpDevicesResponse = dhcpDevicesSchema.safeParse(
				dhcpDevicesResponse.data
			);
			if (!parsedDhcpDevicesResponse.success) {
				console.log('[ERROR] Failed to parse dhcp devices response', {
					displayName: router.displayName,
					error: parsedDhcpDevicesResponse.error
				});
				return;
			}
			if (parsedDhcpDevicesResponse.data.result) {
				for (const device of parsedDhcpDevicesResponse.data.result[1]
					.dhcp_leases) {
					dhcpDevices[device.macaddr] = {
						deviceName: device.hostname || 'Unknown Device',
						macAddress: device.macaddr,
						ipAddress: device.ipaddr,
						leaseTime: device.expires
					};
				}
			}
		})
	);
	return {
		success: true,
		data: dhcpDevices
	} as const;
}

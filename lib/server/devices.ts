'use server';

import { ubusCall } from './ubusCalls';
import { dhcpDevicesSchema } from '@/types/ubusCalls';
import { getRouters } from './routerDB';

export async function getDhcpDevices() {
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
	for (const router of allRouters.data) {
		const dhcpDevicesResponse = await ubusCall({
			routerIP: router.routerIP,
			params: ['luci-rpc', 'getDHCPLeases', {}]
		});
		if (!dhcpDevicesResponse.success) {
			console.log('[ERROR] ubus call to get dhcp devices threw an error', {
				routerIP: router.routerIP,
				error: dhcpDevicesResponse.error
			});
			return {
				success: false,
				error: dhcpDevicesResponse.error
			} as const;
		}
		const parsedDhcpDevicesResponse = dhcpDevicesSchema.safeParse(
			dhcpDevicesResponse.data
		);
		if (!parsedDhcpDevicesResponse.success) {
			console.log('[ERROR] Failed to parse dhcp devices response', {
				routerIP: router.routerIP,
				error: parsedDhcpDevicesResponse.error
			});
			return {
				success: false,
				error: 'Failed to parse dhcp devices response'
			} as const;
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
	}
	return {
		success: true,
		data: dhcpDevices
	} as const;
}

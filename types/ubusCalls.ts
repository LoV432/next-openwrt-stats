import { z } from 'zod';

export const loginSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z.union([
		z.tuple([z.literal(6)]),
		z.tuple([
			z.literal(0),
			z.object({
				ubus_rpc_session: z.string(),
				timeout: z.number(),
				expires: z.number()
			})
		])
	])
});

export const failedSessionSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	error: z.object({
		code: z.number(),
		message: z.string()
	})
});

export const getNetworkInterfacesSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z
		.tuple([
			z.literal(0),
			z.object({
				interface: z.array(
					z.object({
						interface: z.string(),
						l3_device: z.string(),
						device: z.string().optional()
					})
				)
			})
		])
		.optional()
});

export const getRealTimeStatsSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z.tuple([
		z.number(),
		z.object({ result: z.array(z.array(z.number())) })
	])
});

export const dhcpDevicesSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z.tuple([
		z.literal(0),
		z.object({
			dhcp_leases: z.array(
				z.object({
					expires: z.union([z.number(), z.boolean()]),
					hostname: z.string(),
					macaddr: z.string(),
					duid: z.string(),
					ipaddr: z.string()
				})
			)
		})
	])
});

const radioSchema = z.object({
	config: z.object({
		band: z.string(),
		htmode: z.string()
	}),
	interfaces: z.array(
		z.object({
			section: z.string(),
			ifname: z.string(),
			iwinfo: z.object({
				channel: z.number(),
				phy: z.string(),
				txpower: z.number(),
				ssid: z.string()
			})
		})
	)
});

export type Radio = z.infer<typeof radioSchema>;

export const wifiAPsSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z.tuple([z.literal(0), z.record(z.string(), radioSchema)])
});

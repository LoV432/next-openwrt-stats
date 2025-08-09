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
					hostname: z.string().optional(),
					macaddr: z.string(),
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

export const wifiClientsSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z.tuple([
		z.literal(0),
		z.object({
			results: z.array(
				z.object({
					mac: z.string(),
					signal: z.number(),
					signal_avg: z.number(),
					noise: z.number(),
					connected_time: z.number(),
					rx: z.object({
						packets: z.number(),
						bytes: z.number()
					}),
					tx: z.object({
						packets: z.number(),
						bytes: z.number()
					})
				})
			)
		})
	])
});

export type WifiClients = z.infer<typeof wifiClientsSchema>;

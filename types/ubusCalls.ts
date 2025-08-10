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

const networkInterface = z.object({
	interface: z.string(),
	l3_device: z.string(),
	proto: z.string(),
	up: z.boolean(),
	uptime: z.number(),
	device: z.string().optional(),
	'dns-server': z.array(z.string()).optional(),
	'ipv4-address': z.array(
		z.object({
			address: z.string(),
			mask: z.number(),
			ptpaddress: z.string().optional()
		})
	)
});

export type NetworkInterface = z.infer<typeof networkInterface>;

export const getNetworkInterfacesSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z
		.tuple([
			z.literal(0),
			z.object({
				interface: z.array(networkInterface)
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

const wireguardPeerSchema = z.object({
	name: z.string(),
	public_key: z.string(),
	endpoint: z.string(),
	allowed_ips: z.array(z.string()),
	latest_handshake: z.string(),
	transfer_rx: z.string(),
	transfer_tx: z.string(),
	persistent_keepalive: z.string()
});

const wireguardInterface = z.object({
	name: z.string(),
	public_key: z.string(),
	listen_port: z.string(),
	fwmark: z.string(),
	peers: z.array(wireguardPeerSchema)
});

export const wireguardInterfacesSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z.tuple([z.literal(0), z.record(z.string(), wireguardInterface)])
});

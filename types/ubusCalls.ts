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
	interfaces: z
		.array(
			z.object({
				section: z.string(),
				ifname: z.string(),
				iwinfo: z.object({
					channel: z.number(),
					phy: z.string(),
					txpower: z.number(),
					ssid: z.string(),
					bitrate: z.number().optional()
				})
			})
		)
		.nullable()
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

const pbrPolicy = z.object({
	'.anonymous': z.boolean(),
	'.type': z.literal('policy'),
	'.name': z.string(),
	'.index': z.number(),
	enabled: z.string().default('1'),
	name: z.string().optional(),
	src_addr: z.string().optional(),
	src_port: z.string().optional(),
	dest_addr: z.string().optional(),
	dest_port: z.string().optional(),
	proto: z.string().optional(),
	chain: z.string().optional(),
	interface: z.string()
});

export type PbrPolicy = z.infer<typeof pbrPolicy>;

const pbrInclude = z.object({
	'.anonymous': z.boolean(),
	'.type': z.literal('include'),
	'.name': z.string(),
	'.index': z.number(),
	path: z.string(),
	enabled: z.string().optional()
});

const pbrPolicyConfig = z.object({
	'.anonymous': z.boolean(),
	'.type': z.literal('pbr'),
	'.name': z.string(),
	'.index': z.number(),
	enabled: z.string(),
	// verbosity: z.string(),
	// strict_enforcement: z.string(),
	// resolver_set: z.string(),
	// resolver_instance: z.array(z.string()),
	// ipv6_enabled: z.string(),
	// boot_timeout: z.string(),
	// rule_create_option: z.string(),
	// procd_boot_delay: z.string(),
	// procd_reload_delay: z.string(),
	// webui_show_ignore_target: z.string(),
	// nft_rule_counter: z.string(),
	// nft_set_auto_merge: z.string(),
	// nft_set_counter: z.string(),
	// nft_set_flags_interval: z.string(),
	// nft_set_flags_timeout: z.string(),
	// nft_set_timeout: z.string(),
	// nft_set_policy: z.string(),
	webui_supported_protocol: z.array(z.string())
	// ignored_interface: z.array(z.string())
});

const pbrUnknown = z
	.object({
		'.anonymous': z.boolean(),
		'.type': z.literal('unknown'),
		'.name': z.string(),
		'.index': z.number()
	})
	.catchall(z.unknown());

const anyPbr = z.preprocess(
	(val) => {
		if (
			typeof val === 'object' &&
			val !== null &&
			'.type' in val &&
			typeof (val as any)['.type'] === 'string'
		) {
			const t = (val as any)['.type'];
			if (!['pbr', 'policy', 'include'].includes(t)) {
				return { ...val, '.type': 'unknown' };
			}
		}
		return val;
	},
	z.discriminatedUnion('.type', [
		pbrPolicyConfig,
		pbrPolicy,
		pbrInclude,
		pbrUnknown
	])
);

export const pbrPolicySchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z.tuple([
		z.literal(0),
		z.object({
			values: z.record(z.string(), anyPbr)
		})
	])
});

export const pbrInterfacesSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z.tuple([
		z.literal(0),
		z.object({
			pbr: z.object({
				interfaces: z.array(z.string())
			})
		})
	])
});

export const addPolicyForm = z.object({
	name: z.string().min(1, 'Name is required'),
	enabled: z.string().min(1, 'Enabled is required'),
	src_addr: z
		.string()
		.transform((val) => {
			if (val === '') {
				return undefined;
			}
			return val;
		})
		.optional(),
	src_port: z.string().optional(),
	dest_addr: z.string().optional(),
	dest_port: z.string().optional(),
	chain: z.string().optional(),
	interface: z.string().min(1, 'Interface is required'),
	proto: z.string().optional()
});

export const addPolicyFormClient = z.object({
	...addPolicyForm.shape,
	predefinedDstAddr: z.array(z.string())
});

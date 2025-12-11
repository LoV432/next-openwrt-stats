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

export const validResponseSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z.tuple([z.number(), z.any()])
});
export const accessDeniedSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	error: z.object({
		code: z.number(),
		message: z.literal('Access denied')
	})
});

export const batchResponseSchema = z.array(
	z.object({
		jsonrpc: z.string(),
		id: z.number(),
		result: z.tuple([z.number(), z.any()]).optional()
	})
);

export const routerInfoSchema = z.object({
	localtime: z.number(),
	uptime: z.number(),
	load: z.array(z.number()),
	memory: z.object({
		total: z.number(),
		free: z.number(),
		shared: z.number(),
		buffered: z.number(),
		available: z.number(),
		cached: z.number()
	}),
	root: z.object({
		total: z.number(),
		free: z.number(),
		used: z.number(),
		avail: z.number()
	}),
	// tmp: z.object({
	// 	total: z.number(),
	// 	free: z.number(),
	// 	used: z.number(),
	// 	avail: z.number()
	// }),
	// swap: z.object({ total: z.number(), free: z.number() }),
	// kernel: z.string(),
	// hostname: z.string(),
	system: z.string(),
	model: z.string(),
	board_name: z.string(),
	rootfs_type: z.string(),
	release: z.object({
		// distribution: z.string(),
		version: z.string(),
		// revision: z.string(),
		target: z.string()
		// description: z.string(),
		// builddate: z.string()
	})
	// revision: z.string(),
	// branch: z.string()
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

const wifiAPLiveData = z.object({
	config: z.object({
		band: z.string(),
		htmode: z.string()
	}),
	interfaces: z
		.array(
			z.object({
				section: z.string(),
				ifname: z.string().optional(),
				iwinfo: z
					.object({
						channel: z.number().optional(),
						txpower: z.number().optional(),
						ssid: z.string().optional(),
						bitrate: z.number().optional()
					})
					.optional()
			})
		)
		.nullable()
});

export const wifiAPsLiveDataSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z.tuple([z.literal(0), z.record(z.string(), wifiAPLiveData)])
});

export const wifiConfig = z.object({
	'.type': z.literal('wifi-iface'),
	'.name': z.string(),
	ssid: z.string(),
	device: z.string(),
	disabled: z.string().optional(),
	key: z.string().optional(),
	hidden: z.string().optional()
});

export const wifiConfigParent = z.object({
	'.type': z.literal('wifi-device'),
	'.name': z.string(),
	channel: z.string(),
	band: z.string(),
	htmode: z.string(),
	txpower: z.string().optional(),
	disabled: z.string().optional(),
	country: z.string().optional()
});

export const wifiConfigSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z.tuple([
		z.literal(0),
		z.object({
			values: z.record(
				z.string(),
				z.discriminatedUnion('.type', [wifiConfig, wifiConfigParent])
			)
		})
	])
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

export const wifiHostapdClientsSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z.tuple([
		z.literal(0),
		z.object({
			clients: z.record(
				z.string(),
				z.object({
					signal: z.number().optional(),
					bytes: z
						.object({
							rx: z.number(),
							tx: z.number()
						})
						.optional(),
					packets: z
						.object({
							rx: z.number(),
							tx: z.number()
						})
						.optional()
				})
			)
		})
	])
});

export type WifiClientsType = z.infer<typeof wifiClientsSchema>;

const wireguardPeerSchema = z.object({
	name: z
		.string()
		.optional()
		.nullable()
		.transform((val) => {
			if (val === null) {
				return 'Untitled Peer';
			}
			return val;
		}),
	public_key: z.string(),
	endpoint: z.string(),
	// allowed_ips: z.array(z.string()),
	latest_handshake: z.string(),
	transfer_rx: z.string(),
	transfer_tx: z.string()
	// persistent_keepalive: z.string()
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

export const wifiAPUpdateForm = z.object({
	ssid: z.string().min(1, 'SSID is required'),
	password: z.string().optional(),
	channel: z.string().min(1, 'Channel is required'),
	hidden: z.string().default('0'),
	txpower: z.string().min(1, 'Txpower is required'),
	country: z.string().min(1, 'Country is required')
});

export const wifiAPUpdateFormServer = z.object({
	values: wifiAPUpdateForm,
	displayName: z.string().min(1, 'Display name is required'),
	configSection: z.string().min(1, 'Config section is required'),
	parentConfigSection: z.string().min(1, 'Config parent section is required')
});

export const wifiAPFrequencyListSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z.tuple([
		z.literal(0),
		z.object({
			results: z.array(
				z.object({
					channel: z.number(),
					band: z.number(),
					active: z.boolean().optional()
				})
			)
		})
	])
});

export const wifiAPTxPowerListSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z.tuple([
		z.literal(0),
		z.object({
			results: z.array(
				z.object({
					dbm: z.number(),
					active: z.boolean().optional()
				})
			)
		})
	])
});

export const wifiAPCountryListSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z.tuple([
		z.literal(0),
		z.object({
			results: z.array(
				z.object({
					country: z.string(),
					code: z.string(),
					active: z.boolean().optional()
				})
			)
		})
	])
});

export const routerTimezoneSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z.tuple([
		z.literal(0),
		z.record(
			z.string(),
			z.object({
				tzstring: z.string(),
				active: z.boolean().optional()
			})
		)
	])
});

export const wireguardPeerConfigSchema = z.object({
	'.type': z.string(),
	'.name': z.string(),
	public_key: z.string(),
	private_key: z.string().optional(),
	preshared_key: z.string().optional(),
	description: z.string().optional(),
	endpoint_host: z.string().optional(),
	endpoint_port: z.string().optional(),
	allowed_ips: z.array(z.string()).optional(),
	persistent_keepalive: z.string().optional(),
	route_allowed_ips: z.string().optional(),
	disabled: z.string().optional()
});

export const wireguardPeerConfigArraySchema = z.array(
	wireguardPeerConfigSchema
);

export const wireguardPeerConfigClientSchema = z
	.object({
		...wireguardPeerConfigSchema.shape,
		'.type': z.string().optional(),
		'.name': z.string().optional(),
		public_key: z
			.string('Public key is required')
			.min(1, 'Public key is required')
	})
	.transform((val) => {
		Object.entries(val).forEach(([k, v]) => {
			if (v === '') {
				delete val[k as keyof typeof val];
			}
		});
		return val;
	});

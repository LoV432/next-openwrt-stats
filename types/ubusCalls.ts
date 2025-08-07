import { z } from 'zod';

export const loginSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	result: z.union([
		z.tuple([z.literal(6)]),
		z.tuple([
			z.literal(0),
			z.intersection(
				z.object({
					ubus_rpc_session: z.string(),
					timeout: z.number(),
					expires: z.number()
				}),
				z.record(z.string(), z.any())
			)
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
					z.intersection(
						z.object({
							interface: z.string(),
							l3_device: z.string(),
							device: z.string().optional()
						}),
						z.record(z.string(), z.any())
					)
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
				z.union([
					z.object({
						expires: z.union([z.number(), z.boolean()]),
						hostname: z.string(),
						macaddr: z.string(),
						duid: z.string(),
						ipaddr: z.string()
					})
				])
			),
			dhcp6_leases: z.any()
		})
	])
});

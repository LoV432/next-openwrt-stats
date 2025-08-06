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

export const getNetworkInterfacesSchema = z.object({
	jsonrpc: z.string(),
	id: z.number(),
	error: z
		.object({
			code: z.number(),
			message: z.string()
		})
		.optional(),
	result: z
		.tuple([
			z.literal(0),
			z.object({
				interface: z.array(
					z.intersection(
						z.object({
							interface: z.string()
						}),
						z.record(z.string(), z.any())
					)
				)
			})
		])
		.optional()
});

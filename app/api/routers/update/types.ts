import { z } from 'zod';

export const buildResponseSchema = z.object({
	request_hash: z.string(),
	status: z.number(),
	imagebuilder_status: z.string().optional(),
	bin_dir: z.string().optional(),
	images: z
		.array(
			z.object({ name: z.string(), type: z.string(), filesystem: z.string() })
		)
		.optional()
});

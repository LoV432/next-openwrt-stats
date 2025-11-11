import 'server-only';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildResponseSchema } from '../types';
import { logError } from '@/lib/client/errorLog';

const statusRequestSchema = z.object({
	requestHash: z.string().min(1, 'Request hash is required')
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const parsedBody = statusRequestSchema.safeParse(body);

		if (!parsedBody.success) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Invalid request body'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const { requestHash } = parsedBody.data;

		const statusResponse = await fetch(
			`https://sysupgrade.openwrt.org/api/v1/build/${requestHash}`,
			{
				method: 'GET',
				headers: {
					'User-Agent': 'next-openwrt-stats/2.0.0'
				}
			}
		);

		if (!statusResponse.ok) {
			const errorText = await statusResponse.text();
			logError({
				errorMessage: 'Failed to check build status',
				requestHash,
				status: statusResponse.status,
				rawResponse: errorText
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to check build status',
					errorDetails: errorText
				}),
				{
					status: statusResponse.status,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const statusData = await statusResponse.json();

		const parsedStatusData = buildResponseSchema.safeParse(statusData);
		if (!parsedStatusData.success) {
			logError({
				errorMessage: 'Failed to parse build status response',
				requestHash,
				zodError: parsedStatusData.error,
				rawResponse: statusData
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to parse build status response'
				}),
				{
					status: 500,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		return new Response(
			JSON.stringify({
				success: true,
				data: parsedStatusData.data
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	} catch (error: any) {
		logError({
			errorMessage: 'Failed to check build status',
			error
		});
		return new Response(
			JSON.stringify({
				success: false,
				error: error.message
					? `Failed to check build status: ${error.message}`
					: 'Failed to check build status',
				errorDetails: error?.cause
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}
}

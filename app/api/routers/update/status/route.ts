import 'server-only';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildResponseSchema } from '../types';

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
			console.log('[ERROR] Failed to check build status', {
				status: statusResponse.status,
				error: errorText
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
			console.log(
				'[ERROR] Failed to parse build status response:',
				parsedStatusData.error
			);
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
		console.log('[ERROR] Failed to check build status', {
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

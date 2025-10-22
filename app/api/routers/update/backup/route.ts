import 'server-only';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getRouter } from '@/lib/server/router';

const backupRequestSchema = z.object({
	displayName: z.string().min(1, 'Display name is required')
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const parsedBody = backupRequestSchema.safeParse(body);

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

		const { displayName } = parsedBody.data;

		const router = await getRouter(displayName);
		if (!router.success) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'No router found'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const backupResponse = await fetch(
			`${router.data.routerIP}/cgi-bin/cgi-backup`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: `sessionid=${router.data.session}`
			}
		);

		if (!backupResponse.ok) {
			const errorText = await backupResponse.text();
			console.log('[ERROR] Failed to get backup', {
				status: backupResponse.status,
				error: errorText
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to get backup',
					errorDetails: errorText
				}),
				{
					status: backupResponse.status,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		return new Response(backupResponse.body, {
			status: 200,
			headers: {
				'Content-Type': 'application/x-targz'
			}
		});
	} catch (error: any) {
		console.log('[ERROR] Failed to get backup', {
			error
		});
		return new Response(
			JSON.stringify({
				success: false,
				error: error?.message
					? `Failed to get backup: ${error.message}`
					: 'Failed to get backup'
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

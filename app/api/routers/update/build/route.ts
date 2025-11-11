import 'server-only';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildResponseSchema } from '../types';
import { logError } from '@/lib/client/errorLog';

const buildRequestSchema = z.object({
	displayName: z.string().min(1, 'Display name is required'),
	latestVersion: z.string().min(1, 'Version is required'),
	target: z.string().min(1, 'Target is required'),
	profile: z.string().min(1, 'Profile is required'),
	packages: z.array(z.string()).default([])
});

export type BuildAndStatusResponse =
	| {
			success: true;
			data: z.infer<typeof buildResponseSchema>;
	  }
	| {
			success: false;
			error: string;
			errorDetails?: string;
	  };

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const parsedBody = buildRequestSchema.safeParse(body);

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

		const {
			latestVersion: updateVersion,
			target,
			profile,
			packages
		} = parsedBody.data;

		const buildRequest = {
			version: updateVersion,
			target,
			profile,
			packages: packages,
			distro: 'openwrt',
			diff_packages: true,
			client: 'next-openwrt-stats/2.0.0'
		};

		const buildResponse = await fetch(
			'https://sysupgrade.openwrt.org/api/v1/build',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'User-Agent': 'next-openwrt-stats/2.0.0'
				},
				body: JSON.stringify(buildRequest)
			}
		);

		if (!buildResponse.ok) {
			const errorText = await buildResponse.text();
			logError({
				displayName: parsedBody.data.displayName,
				errorMessage: 'Failed to start build',
				rawResponse: errorText,
				status: buildResponse.status
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to start build',
					errorDetails: errorText
				}),
				{
					status: buildResponse.status,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const buildData = await buildResponse.json();

		const parsedBuildData = buildResponseSchema.safeParse(buildData);
		if (!parsedBuildData.success) {
			logError({
				displayName: parsedBody.data.displayName,
				errorMessage: 'Failed to parse build response',
				zodError: parsedBuildData.error,
				rawResponse: buildData
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to parse build response'
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
				data: parsedBuildData.data
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
			errorMessage: 'Failed to build sysupgrade',
			error
		});
		return new Response(
			JSON.stringify({
				success: false,
				error: error?.message
					? `Failed to build sysupgrade: ${error.message}`
					: 'Failed to build sysupgrade',
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

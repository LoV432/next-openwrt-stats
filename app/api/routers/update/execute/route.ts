import 'server-only';
import { NextRequest } from 'next/server';
import { getRouter } from '@/lib/server/router';
import { z } from 'zod';
import { ubusCall } from '@/lib/server/ubusCalls';
import { logError } from '@/lib/client/errorLog';

const executeRequestSchema = z.object({
	displayName: z.string().min(1, 'Display name is required')
});

const validateFirmwareResponseSchema = z.object({
	valid: z.boolean(),
	allow_backup: z.boolean()
});

export type FirmwareUpdateExecuteResponse =
	| {
			success: true;
	  }
	| {
			success: false;
			error: string;
	  };

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const parsedBody = executeRequestSchema.safeParse(body);

		if (!parsedBody.success) {
			logError({
				errorMessage: 'Invalid request body',
				zodError: parsedBody.error
			});
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

		const validateFirmware = await ubusCall({
			displayName,
			params: [
				'system',
				'validate_firmware_image',
				{
					path: '/tmp/firmware.bin'
				}
			]
		});

		if (!validateFirmware.success) {
			logError({
				displayName,
				errorMessage: 'Failed to validate sysupgrade image',
				...validateFirmware
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to validate sysupgrade image'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const validateFirmwareParsed = validateFirmwareResponseSchema.safeParse(
			validateFirmware.data.result[1]
		);

		if (!validateFirmwareParsed.success) {
			logError({
				displayName,
				errorMessage: 'Failed to validate sysupgrade image',
				zodError: validateFirmwareParsed.error,
				...validateFirmware
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to validate sysupgrade image'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		if (
			!validateFirmwareParsed.data.valid &&
			!validateFirmwareParsed.data.allow_backup
		) {
			logError({
				displayName,
				errorMessage: 'Failed to validate sysupgrade image',
				...validateFirmware
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to validate sysupgrade image'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const sysupgradeUbusCall = await ubusCall({
			displayName,
			params: [
				'file',
				'exec',
				{
					command: `/sbin/sysupgrade`,
					params: ['/tmp/firmware.bin']
				}
			],
			attemptRetry: false
		});

		if (!sysupgradeUbusCall.success) {
			logError({
				displayName,
				errorMessage: 'Failed to execute sysupgrade',
				...sysupgradeUbusCall
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to execute sysupgrade'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		return new Response(
			JSON.stringify({
				success: true
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	} catch (error) {
		logError({
			errorMessage: 'Failed to execute sysupgrade',
			error
		});
		return new Response(
			JSON.stringify({
				success: false,
				error: 'Failed to execute sysupgrade'
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

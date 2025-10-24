import 'server-only';
import { NextRequest } from 'next/server';
import { getRouter } from '@/lib/server/router';
import { z } from 'zod';
import { ubusCall } from '@/lib/server/ubusCalls';

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
			console.log('[ERROR] Invalid request body', {
				error: parsedBody.error
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
			console.log('[ERROR] Failed to validate sysupgrade image', {
				error: validateFirmware.error
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
			console.log(
				'[ERROR] Failed to parse validate sysupgrade image response:',
				validateFirmwareParsed.error
			);
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
			console.log(
				'[ERROR] Failed to validate sysupgrade image:',
				validateFirmwareParsed.data
			);
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
			console.log('[ERROR] Failed to execute sysupgrade', {
				error: sysupgradeUbusCall.error
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
		console.log('[ERROR] Failed to execute sysupgrade', {
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

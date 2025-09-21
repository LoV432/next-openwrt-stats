'use server';
import 'server-only';
import { getRouter } from './router';
import { ubusCall } from './ubusCalls';

export async function disableWifiAPAction({
	displayName,
	configSection
}: {
	displayName: string;
	configSection: string;
}) {
	const router = await getRouter(displayName);
	if (!router.success) {
		return router;
	}

	const ubusResponse = await ubusCall({
		displayName: router.data.displayName,
		params: [
			'uci',
			'set',
			{
				config: 'wireless',
				section: configSection,
				values: {
					disabled: '1'
				}
			}
		]
	});

	if (!ubusResponse.success) {
		return {
			success: false,
			error:
				'Something went wrong while disabling the wifi AP. Please see logs for more details'
		} as const;
	}

	const confirmResponse = await ubusCall({
		displayName: router.data.displayName,
		params: [
			'uci',
			'commit',
			{
				config: 'wireless'
			}
		],
		attemptRetry: false
	});

	if (!confirmResponse.success) {
		return {
			success: false,
			error: confirmResponse.error
		} as const;
	}

	return {
		success: true,
		data: true
	} as const;
}

export async function enabledWifiAPAction({
	displayName,
	configSection
}: {
	displayName: string;
	configSection: string[];
}) {
	const router = await getRouter(displayName);
	if (!router.success) {
		return router;
	}

	const [delte1, delete2] = await Promise.all([
		ubusCall({
			displayName: router.data.displayName,
			params: [
				'uci',
				'delete',
				{
					config: 'wireless',
					section: configSection[0],
					options: ['disabled']
				}
			]
		}),
		ubusCall({
			displayName: router.data.displayName,
			params: [
				'uci',
				'delete',
				{
					config: 'wireless',
					section: configSection[1],
					options: ['disabled']
				}
			]
		})
	]);

	if (!delte1.success || !delete2.success) {
		return {
			success: false,
			error:
				'Something went wrong while enabling the wifi AP. Please see logs for more details'
		} as const;
	}

	const confirmResponse = await ubusCall({
		displayName: router.data.displayName,
		params: [
			'uci',
			'commit',
			{
				config: 'wireless'
			}
		],
		attemptRetry: false
	});

	if (!confirmResponse.success) {
		return {
			success: false,
			error:
				'Something went wrong while committing the changes. Please see logs for more details'
		} as const;
	}

	return {
		success: true,
		data: true
	} as const;
}

'use server';
import 'server-only';
import { getRouter } from './router';
import { ubusCall } from './ubusCalls';

export async function disableWifiAPAction({
	routerIP,
	configSection
}: {
	routerIP: string;
	configSection: string;
}) {
	const router = await getRouter(routerIP);
	if (!router.success) {
		return router;
	}

	const ubusResponse = await ubusCall({
		routerIP: router.data.routerIP,
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
		console.log('[ERROR] ubus call to disable wifi AP threw an error', {
			routerIP: router.data.routerIP,
			error: ubusResponse.error
		});
		return {
			success: false,
			error: ubusResponse.error
		} as const;
	}

	const confirmResponse = await ubusCall({
		routerIP: router.data.routerIP,
		params: [
			'uci',
			'commit',
			{
				config: 'wireless'
			}
		]
	});

	if (!confirmResponse.success) {
		console.log('[ERROR] ubus call to commit wifi AP disable threw an error', {
			routerIP: router.data.routerIP,
			error: confirmResponse.error
		});
		return {
			success: false,
			error: confirmResponse.error
		} as const;
	}
	console.log(JSON.stringify(confirmResponse.data));

	return {
		success: true,
		data: ubusResponse.data
	} as const;
}

export async function enabledWifiAPAction({
	routerIP,
	configSection
}: {
	routerIP: string;
	configSection: string[];
}) {
	const router = await getRouter(routerIP);
	if (!router.success) {
		return router;
	}

	const [delte1, delete2] = await Promise.all([
		ubusCall({
			routerIP: router.data.routerIP,
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
			routerIP: router.data.routerIP,
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
		console.log('[ERROR] ubus call to enable wifi AP threw an error', {
			routerIP: router.data.routerIP,
			error: [delte1.error, delete2.error]
		});
		return {
			success: false,
			error: [delte1.error, delete2.error]
		} as const;
	}

	const confirmResponse = await ubusCall({
		routerIP: router.data.routerIP,
		params: [
			'uci',
			'commit',
			{
				config: 'wireless'
			}
		]
	});

	if (!confirmResponse.success) {
		console.log('[ERROR] ubus call to commit wifi AP enable threw an error', {
			routerIP: router.data.routerIP,
			error: confirmResponse.error
		});
		return {
			success: false,
			error: confirmResponse.error
		} as const;
	}
	console.log(JSON.stringify(confirmResponse.data));

	return {
		success: true,
		data: [delte1.data, delete2.data, confirmResponse.data]
	} as const;
}

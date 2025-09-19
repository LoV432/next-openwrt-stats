import 'server-only';
import { pbrInterfacesSchema, pbrPolicySchema } from '@/types/ubusCalls';
import { ubusCall } from './ubusCalls';
import { getPrimaryRouter } from './router';

export type PbrPolicy = Awaited<ReturnType<typeof getPBRPolicy>>;
export async function getPBRPolicy() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	const pbrPolicyResponse = await ubusCall({
		displayName: primaryRouter.data.displayName,
		params: [
			'uci',
			'get',
			{
				config: 'pbr'
			}
		]
	});

	if (!pbrPolicyResponse.success) {
		console.log('[ERROR] ubus call to get pbr policy threw an error', {
			displayName: primaryRouter.data.displayName,
			error: pbrPolicyResponse.error
		});
		return {
			success: false,
			error: pbrPolicyResponse.error
		} as const;
	}

	const parsedPbrPolicyResponse = pbrPolicySchema.safeParse(
		pbrPolicyResponse.data
	);
	if (!parsedPbrPolicyResponse.success) {
		console.log('[ERROR] Failed to parse pbr policy response', {
			displayName: primaryRouter.data.displayName,
			error: parsedPbrPolicyResponse.error
		});
		return {
			success: false,
			error: 'Failed to parse pbr policy response'
		} as const;
	}

	return {
		success: true,
		data: parsedPbrPolicyResponse.data.result[1].values
	} as const;
}

export type PbrInterfaces = Awaited<ReturnType<typeof getPBRInterfaces>>;
export async function getPBRInterfaces() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	const pbrInterfacesResponse = await ubusCall({
		displayName: primaryRouter.data.displayName,
		params: ['luci.pbr', 'getInterfaces', {}]
	});

	if (!pbrInterfacesResponse.success) {
		console.log('[ERROR] ubus call to get pbr interfaces threw an error', {
			displayName: primaryRouter.data.displayName,
			error: pbrInterfacesResponse.error
		});
		return {
			success: false,
			error: pbrInterfacesResponse.error
		} as const;
	}

	const parsedPbrPolicyResponse = pbrInterfacesSchema.safeParse(
		pbrInterfacesResponse.data
	);
	if (!parsedPbrPolicyResponse.success) {
		console.log('[ERROR] Failed to parse pbr policy response', {
			displayName: primaryRouter.data.displayName,
			error: parsedPbrPolicyResponse.error
		});
		return {
			success: false,
			error: 'Failed to parse pbr policy response'
		} as const;
	}

	return {
		success: true,
		data: parsedPbrPolicyResponse.data.result[1].pbr.interfaces
	} as const;
}

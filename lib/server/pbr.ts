import 'server-only';
import { pbrPolicySchema, pbrInterfacesSchema } from '@/types/ubusCalls';
import { ubusCall } from './ubusCalls';
import { getPrimaryRouter } from './router';
import { logError } from '../client/errorLog';

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
		logError({
			displayName: primaryRouter.data.displayName,
			errorMessage: 'Failed to get pbr policy',
			...pbrPolicyResponse
		});
		return {
			success: false,
			error:
				'Something went wrong while getting the pbr policy. Please see logs for more details'
		} as const;
	}

	const parsedPbrPolicyResponse = pbrPolicySchema.safeParse(
		pbrPolicyResponse.data
	);
	if (!parsedPbrPolicyResponse.success) {
		logError({
			displayName: primaryRouter.data.displayName,
			errorMessage: 'Failed to parse pbr policy response',
			zodError: parsedPbrPolicyResponse.error,
			...pbrPolicyResponse
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
		logError({
			displayName: primaryRouter.data.displayName,
			errorMessage: 'Failed to get pbr interfaces',
			...pbrInterfacesResponse
		});
		return {
			success: false,
			error:
				'Something went wrong while getting the pbr interfaces. Please see logs for more details'
		} as const;
	}

	const parsedPbrPolicyResponse = pbrInterfacesSchema.safeParse(
		pbrInterfacesResponse.data
	);
	if (!parsedPbrPolicyResponse.success) {
		logError({
			displayName: primaryRouter.data.displayName,
			errorMessage: 'Failed to parse pbr interfaces response',
			zodError: parsedPbrPolicyResponse.error,
			...pbrInterfacesResponse
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

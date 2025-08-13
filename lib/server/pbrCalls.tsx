'use server';
import {
	addPolicyForm,
	pbrInterfacesSchema,
	pbrPolicySchema
} from '@/types/ubusCalls';
import { ubusCall } from './ubusCalls';
import { getPrimaryRouter } from './routerDB';

export async function getPBRPolicy() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	const pbrPolicyResponse = await ubusCall({
		routerIP: primaryRouter.data.routerIP,
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
			routerIP: primaryRouter.data.routerIP,
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
			routerIP: primaryRouter.data.routerIP,
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

export async function getPBRInterfaces() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	const pbrInterfacesResponse = await ubusCall({
		routerIP: primaryRouter.data.routerIP,
		params: ['luci.pbr', 'getInterfaces', {}]
	});

	if (!pbrInterfacesResponse.success) {
		console.log('[ERROR] ubus call to get pbr interfaces threw an error', {
			routerIP: primaryRouter.data.routerIP,
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
			routerIP: primaryRouter.data.routerIP,
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

export async function setPBRPolicy({
	values
}: {
	values: {
		name: string;
		enabled: string;
		src_addr?: string;
		src_port?: string;
		dest_addr?: string;
		dest_port?: string;
		interface: string;
		proto?: string;
		chain?: string;
	};
}) {
	const parsedForm = addPolicyForm.safeParse(values);
	if (!parsedForm.success) {
		return {
			success: false,
			error: 'Invalid form values'
		} as const;
	}
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	const postData: Record<string, string> = {};
	Object.entries(parsedForm.data).forEach(([key, value]) => {
		if (value) {
			postData[key] = value;
		}
	});

	const pbrPolicyResponse = await ubusCall({
		routerIP: primaryRouter.data.routerIP,
		params: [
			'uci',
			'add',
			{
				config: 'pbr',
				type: 'policy',
				values: postData
			}
		]
	});
	if (!pbrPolicyResponse.success) {
		console.log('[ERROR] ubus call to add policy threw an error', {
			routerIP: primaryRouter.data.routerIP,
			parsedForm,
			pbrPolicyResponse
		});
		return {
			success: false,
			error: pbrPolicyResponse.error
		} as const;
	}

	const commitChangesResponse = await commitPBRchanges();
	if (!commitChangesResponse.success) {
		console.log('[ERROR] attempt to commit add policy changes threw an error', {
			routerIP: primaryRouter.data.routerIP,
			error: commitChangesResponse.error
		});
		return {
			success: false,
			error: commitChangesResponse.error
		} as const;
	}

	return {
		success: true,
		data: commitChangesResponse.data
	} as const;
}

export async function editPBRPolicy({
	values,
	policy
}: {
	values: Record<string, any>;
	policy: string;
}) {
	const parsedNewValues = addPolicyForm.safeParse(values);
	if (!parsedNewValues.success) {
		return {
			success: false,
			error: 'Invalid form values'
		} as const;
	}
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	const currentPolicies = await getPBRPolicy();
	if (currentPolicies.error) {
		console.log('[ERROR] getPBRPolicy threw an error', {
			routerIP: primaryRouter.data.routerIP,
			error: currentPolicies.error
		});
		return {
			success: false,
			error: currentPolicies.error
		} as const;
	}

	let policyToEdit = currentPolicies.data[policy];
	if (!policyToEdit || policyToEdit['.type'] !== 'policy') {
		console.log('[ERROR] Attempted to edit policy that does not exist', {
			routerIP: primaryRouter.data.routerIP,
			policy
		});
		return {
			success: false,
			error: 'Policy not found'
		} as const;
	}

	const oldValues = Object.entries(policyToEdit);
	const newValues = Object.entries(parsedNewValues.data);
	const allKeysToDelete = oldValues.filter(
		([key]) =>
			!newValues.some(([newKey]) => newKey === key) && !key.startsWith('.')
	);
	const deleteValues = allKeysToDelete.map(([key]) => key);

	if (deleteValues.length > 0) {
		const deleteResponse = await ubusCall({
			routerIP: primaryRouter.data.routerIP,
			params: [
				'uci',
				'delete',
				{
					config: 'pbr',
					options: deleteValues,
					section: policyToEdit['.name']
				}
			]
		});
		if (!deleteResponse.success) {
			console.log('[ERROR] ubus call to delete policy threw an error', {
				routerIP: primaryRouter.data.routerIP,
				policy,
				error: deleteResponse.error
			});
			return {
				success: false,
				error: deleteResponse.error
			} as const;
		}
	}

	let postData = parsedNewValues.data;
	deleteValues.forEach((key) => {
		if (key in postData) {
			delete postData[key as keyof typeof postData];
		}
	});
	if (Object.keys(postData).length > 0) {
		const pbrPolicyResponse = await ubusCall({
			routerIP: primaryRouter.data.routerIP,
			params: [
				'uci',
				'set',
				{
					config: 'pbr',
					section: policyToEdit['.name'],
					values: postData
				}
			]
		});
		if (!pbrPolicyResponse.success) {
			console.log('[ERROR] ubus call to edit policy threw an error', {
				routerIP: primaryRouter.data.routerIP,
				policy,
				error: pbrPolicyResponse.error
			});
			return {
				success: false,
				error: pbrPolicyResponse.error
			} as const;
		}
	}

	const commitChangesResponse = await commitPBRchanges();
	if (!commitChangesResponse.success) {
		console.log(
			'[ERROR] attempt to commit edit policy changes threw an error',
			{
				routerIP: primaryRouter.data.routerIP,
				error: commitChangesResponse.error
			}
		);
		return {
			success: false,
			error: commitChangesResponse.error
		} as const;
	}

	return {
		success: true,
		data: commitChangesResponse.data
	} as const;
}

export async function deletePBRPolicy({ name }: { name: string }) {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	const pbrPolicyResponse = await ubusCall({
		routerIP: primaryRouter.data.routerIP,
		params: [
			'uci',
			'delete',
			{
				config: 'pbr',
				options: null,
				section: name
			}
		]
	});
	if (!pbrPolicyResponse.success) {
		console.log('[ERROR] ubus call to delete policy threw an error', {
			routerIP: primaryRouter.data.routerIP,
			name,
			error: pbrPolicyResponse.error
		});
		return {
			success: false,
			error: pbrPolicyResponse.error
		} as const;
	}

	const commitChangesResponse = await commitPBRchanges();
	if (!commitChangesResponse.success) {
		console.log(
			'[ERROR] attempt to commit delete policy changes threw an error',
			{
				routerIP: primaryRouter.data.routerIP,
				error: commitChangesResponse.error
			}
		);
		return {
			success: false,
			error: commitChangesResponse.error
		} as const;
	}

	return {
		success: true,
		data: commitChangesResponse.data
	} as const;
}

// async function revertPBRPolicy() {
// 	const primaryRouter = await db
// 		.select({
// 			routerIP: routersTable.routerIP
// 		})
// 		.from(routersTable)
// 		.where(eq(routersTable.isPrimary, 1))
// 		.limit(1);

// 	if (!primaryRouter.length) {
// 		return {
// 			success: false,
// 			error: 'No primary router found'
// 		} as const;
// 	}

// 	const pbrPolicyResponse = await ubusCall({
// 		routerIP: primaryRouter[0].routerIP,
// 		params: ['uci', 'rollback', {}]
// 	});
// 	if (!pbrPolicyResponse.success) {
// 		console.log('[ERROR] Failed to revert pbr policy', {
// 			pbrPolicyResponse
// 		});
// 		return {
// 			success: false,
// 			error: pbrPolicyResponse.error
// 		} as const;
// 	}

// 	return {
// 		success: true,
// 		data: pbrPolicyResponse.data
// 	} as const;
// }

async function commitPBRchanges() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	const commitChangesResponse = await ubusCall({
		routerIP: primaryRouter.data.routerIP,
		params: [
			'uci',
			'commit',
			{
				config: 'pbr'
			}
		]
	});

	if (!commitChangesResponse.success) {
		console.log('[ERROR] Failed to commit pbr changes', {
			commitChangesResponse
		});
		return {
			success: false,
			error: commitChangesResponse.error
		} as const;
	}

	return {
		success: true,
		data: commitChangesResponse.data
	} as const;
}

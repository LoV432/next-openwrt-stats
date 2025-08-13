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
		return {
			success: false,
			error: pbrPolicyResponse.error
		} as const;
	}

	const parsedPbrPolicyResponse = pbrPolicySchema.safeParse(
		pbrPolicyResponse.data
	);
	if (!parsedPbrPolicyResponse.success) {
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
		return {
			success: false,
			error: pbrInterfacesResponse.error
		} as const;
	}

	const parsedPbrPolicyResponse = pbrInterfacesSchema.safeParse(
		pbrInterfacesResponse.data
	);
	if (!parsedPbrPolicyResponse.success) {
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
		console.log('[ERROR] Failed to add policy', {
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
		return {
			success: false,
			error: currentPolicies.error
		} as const;
	}

	let policyToEdit = currentPolicies.data[policy];
	if (!policyToEdit || policyToEdit['.type'] !== 'policy') {
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
			console.log('[ERROR] Failed to edit policy', {
				policy,
				deleteResponse
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
			console.log('[ERROR] Failed to edit policy', {
				policy,
				pbrPolicyResponse
			});
			return {
				success: false,
				error: pbrPolicyResponse.error
			} as const;
		}
	}

	const commitChangesResponse = await commitPBRchanges();
	if (!commitChangesResponse.success) {
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
		console.log('[ERROR] Failed to delete policy', {
			name,
			pbrPolicyResponse
		});
		return {
			success: false,
			error: pbrPolicyResponse.error
		} as const;
	}

	const commitChangesResponse = await commitPBRchanges();
	if (!commitChangesResponse.success) {
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

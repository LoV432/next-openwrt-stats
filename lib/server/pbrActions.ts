'use server';
import 'server-only';
import { addPolicyForm } from '@/types/ubusCalls';
import { ubusCall } from './ubusCalls';
import { getPrimaryRouter } from './router';
import { getPBRPolicy } from './pbr';

export async function setPBRPolicyAction({
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
		displayName: primaryRouter.data.displayName,
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
		return {
			success: false,
			error:
				'Something went wrong while adding the policy. Please see logs for more details'
		} as const;
	}

	const commitChangesResponse = await commitPBRchanges();
	if (!commitChangesResponse.success) {
		return {
			success: false,
			error:
				'Something went wrong while committing the changes. Please see logs for more details'
		} as const;
	}

	return {
		success: true,
		data: commitChangesResponse.data
	} as const;
}

export async function editPBRPolicyAction({
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
			error:
				'Something went wrong while getting the current policies. Please see logs for more details'
		} as const;
	}

	let policyToEdit = currentPolicies.data[policy];
	if (!policyToEdit || policyToEdit['.type'] !== 'policy') {
		console.log('[ERROR] Attempted to edit policy that does not exist', {
			displayName: primaryRouter.data.displayName,
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
			displayName: primaryRouter.data.displayName,
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
			return {
				success: false,
				error:
					'Something went wrong while editing the policy. Please see logs for more details'
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
			displayName: primaryRouter.data.displayName,
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
			return {
				success: false,
				error:
					'Something went wrong while editing the policy. Please see logs for more details'
			} as const;
		}
	}

	const commitChangesResponse = await commitPBRchanges();
	if (!commitChangesResponse.success) {
		return {
			success: false,
			error:
				'Something went wrong while committing the changes. Please see logs for more details'
		} as const;
	}

	return {
		success: true,
		data: commitChangesResponse.data
	} as const;
}

export async function deletePBRPolicyAction({ name }: { name: string }) {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	const pbrPolicyResponse = await ubusCall({
		displayName: primaryRouter.data.displayName,
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

async function commitPBRchanges() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return {
			success: false,
			error: 'Failed to commmit pbr changes. Please see logs for more details'
		};
	}

	const commitChangesResponse = await ubusCall({
		displayName: primaryRouter.data.displayName,
		params: [
			'uci',
			'commit',
			{
				config: 'pbr'
			}
		],
		// All pending changes are nuked on relogin, so if we retry the command will succeed but the changes will be lost
		attemptRetry: false
	});

	if (!commitChangesResponse.success) {
		await ubusCall({
			displayName: primaryRouter.data.displayName,
			params: [
				'uci',
				'revert',
				{
					config: 'pbr'
				}
			],
			attemptRetry: false
		});
		return {
			success: false,
			error:
				'Something went wrong while committing the changes. Please see logs for more details'
		};
	}

	return {
		success: true,
		data: commitChangesResponse.data
	} as const;
}

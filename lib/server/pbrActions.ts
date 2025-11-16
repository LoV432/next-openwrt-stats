'use server';
import 'server-only';
import { addPolicyForm } from '@/types/ubusCalls';
import { ubusCall } from './ubusCalls';
import { getPrimaryRouter } from './router';
import { getPBRPolicy } from './pbr';
import { logError } from '../client/errorLog';

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
	try {
		const parsedForm = addPolicyForm.safeParse(values);
		if (!parsedForm.success) {
			return {
				success: false,
				errorMessage: 'Invalid form values'
			} as const;
		}
		const primaryRouter = await getPrimaryRouter();
		if (!primaryRouter.success) {
			return primaryRouter;
		}

		const postData: Record<string, string> = {};
		Object.entries(parsedForm.data).forEach(([key, value]) => {
			if (value && value !== '') {
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
			throw new Error('Failed to add pbr policy', {
				cause: {
					displayName: primaryRouter.data.displayName,
					...pbrPolicyResponse
				}
			});
		}

		const commitChangesResponse = await commitPBRchanges();
		if (!commitChangesResponse.success) {
			throw new Error('Failed to commit pbr changes', {
				cause: {
					displayName: primaryRouter.data.displayName,
					...commitChangesResponse
				}
			});
		}

		return {
			success: true
		} as const;
	} catch (error) {
		logError({
			errorMessage: 'Failed to add pbr policy',
			error
		});
		const revertResponse = await revertPBRChanges();
		if (!revertResponse.success) {
			logError({
				errorMessage: 'Failed to revert pbr changes',
				...revertResponse
			});
		}
		return {
			success: false,
			errorMessage: 'Something went wrong while adding the policy.'
		} as const;
	}
}

export async function editPBRPolicyAction({
	values,
	policy
}: {
	values: Record<string, any>;
	policy: string;
}) {
	try {
		const parsedNewValues = addPolicyForm.safeParse(values);
		if (!parsedNewValues.success) {
			return {
				success: false,
				errorMessage: 'Invalid form values'
			} as const;
		}
		const primaryRouter = await getPrimaryRouter();
		if (!primaryRouter.success) {
			return {
				success: false,
				errorMessage: 'Failed to get primary router'
			} as const;
		}

		const currentPolicies = await getPBRPolicy();
		if (!currentPolicies.success) {
			return {
				success: false,
				errorMessage: 'Something went wrong while getting the current policies.'
			} as const;
		}

		let policyToEdit = currentPolicies.data[policy];
		if (!policyToEdit || policyToEdit['.type'] !== 'policy') {
			logError({
				displayName: primaryRouter.data.displayName,
				errorMessage: 'Attempted to edit policy that does not exist',
				policy,
				availablePolicies: Object.keys(currentPolicies.data)
			});
			return {
				success: false,
				errorMessage: 'Policy not found'
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
				throw new Error('Failed to delete pbr policy', {
					cause: {
						displayName: primaryRouter.data.displayName,
						...deleteResponse
					}
				});
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
				throw new Error('Failed to edit pbr policy', {
					cause: {
						displayName: primaryRouter.data.displayName,
						...pbrPolicyResponse
					}
				});
			}
		}

		const commitChangesResponse = await commitPBRchanges();
		if (!commitChangesResponse.success) {
			throw new Error('Failed to commit pbr changes', {
				cause: {
					displayName: primaryRouter.data.displayName,
					...commitChangesResponse
				}
			});
		}

		return {
			success: true
		} as const;
	} catch (error) {
		logError({
			errorMessage: 'Failed to edit pbr policy',
			error
		});
		const revertResponse = await revertPBRChanges();
		if (!revertResponse.success) {
			logError({
				errorMessage: 'Failed to revert pbr changes',
				...revertResponse
			});
		}
		return {
			success: false,
			errorMessage: 'Something went wrong while editing the policy.'
		} as const;
	}
}

export async function deletePBRPolicyAction({ name }: { name: string }) {
	try {
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
			throw new Error('Failed to delete pbr policy', {
				cause: {
					displayName: primaryRouter.data.displayName,
					...pbrPolicyResponse
				}
			});
		}

		const commitChangesResponse = await commitPBRchanges();
		if (!commitChangesResponse.success) {
			throw new Error('Failed to commit pbr changes', {
				cause: {
					displayName: primaryRouter.data.displayName,
					...commitChangesResponse
				}
			});
		}

		return {
			success: true
		} as const;
	} catch (error) {
		logError({
			errorMessage: 'Failed to delete pbr policy',
			error
		});
		const revertResponse = await revertPBRChanges();
		if (!revertResponse.success) {
			logError({
				errorMessage: 'Failed to revert pbr changes',
				...revertResponse
			});
		}
		return {
			success: false,
			errorMessage: 'Something went wrong while committing the changes.'
		};
	}
}

async function commitPBRchanges() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return {
			success: false,
			errorMessage: 'Failed to commmit pbr changes.'
		} as const;
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
		attemptRetry: false
	});

	if (!commitChangesResponse.success) {
		return {
			...commitChangesResponse
		} as const;
	}

	return {
		...commitChangesResponse
	} as const;
}

async function revertPBRChanges() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return {
			success: false,
			errorMessage: 'Failed to find router'
		} as const;
	}

	const revertResponse = await ubusCall({
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

	if (!revertResponse.success) {
		return {
			...revertResponse
		} as const;
	}

	return {
		...revertResponse
	} as const;
}

'use server';
import 'server-only';
import { wireguardPeerConfigClientSchema } from '@/types/ubusCalls';
import { ubusCall } from './ubusCalls';
import { getPrimaryRouter } from './router';
import { logError } from '../client/errorLog';

export async function generateWireguardKeyPair() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	const keyPairResponse = await ubusCall({
		displayName: primaryRouter.data.displayName,
		params: ['luci.wireguard', 'generateKeyPair', {}]
	});

	if (!keyPairResponse.success) {
		logError({
			displayName: primaryRouter.data.displayName,
			errorMessage: 'Failed to generate WireGuard key pair',
			...keyPairResponse
		});
		return {
			success: false,
			errorMessage: 'Failed to generate WireGuard key pair'
		} as const;
	}

	const private_key = keyPairResponse.data?.result[1]?.keys?.priv as
		| string
		| undefined;
	const public_key = keyPairResponse.data?.result[1]?.keys?.pub as
		| string
		| undefined;
	if (!private_key || !public_key) {
		return {
			success: false,
			errorMessage: 'Failed to generate WireGuard key pair'
		} as const;
	}

	return {
		success: true,
		data: {
			private_key,
			public_key
		}
	} as const;
}

export async function generateWireguardPsk() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return primaryRouter;
	}

	const pskResponse = await ubusCall({
		displayName: primaryRouter.data.displayName,
		params: ['luci.wireguard', 'generatePsk', {}]
	});

	if (!pskResponse.success) {
		logError({
			displayName: primaryRouter.data.displayName,
			errorMessage: 'Failed to generate WireGuard PSK',
			...pskResponse
		});
		return {
			success: false,
			errorMessage: 'Failed to generate WireGuard PSK'
		} as const;
	}
	const psk = pskResponse.data?.result[1]?.psk as string | undefined;
	if (!psk) {
		return {
			success: false,
			errorMessage: 'Failed to generate WireGuard PSK'
		} as const;
	}

	return {
		success: true,
		data: psk
	} as const;
}

export async function addWireguardPeerAction({
	values,
	interfaceName
}: {
	values: {
		public_key: string;
		private_key?: string;
		preshared_key?: string;
		description?: string;
		endpoint_host?: string;
		endpoint_port?: string;
		allowed_ips?: string[];
		persistent_keepalive?: string;
		route_allowed_ips?: string;
		disabled?: string;
	};
	interfaceName: string;
}) {
	try {
		const parsedForm = wireguardPeerConfigClientSchema.safeParse(values);
		if (!parsedForm.success) {
			logError({
				errorMessage: 'Invalid form values while adding WireGuard peer',
				zodError: parsedForm.error,
				values
			});
			return {
				success: false,
				errorMessage: 'Invalid form values'
			} as const;
		}
		const primaryRouter = await getPrimaryRouter();
		if (!primaryRouter.success) {
			return primaryRouter;
		}

		const postData: Record<string, string | string[]> = {};
		Object.entries(parsedForm.data).forEach(([key, value]) => {
			if (value && value !== '') {
				postData[key] = value;
			}
		});

		const wireguardPeerResponse = await ubusCall({
			displayName: primaryRouter.data.displayName,
			params: [
				'uci',
				'add',
				{
					config: 'network',
					type: `wireguard_${interfaceName}`,
					values: postData
				}
			]
		});
		if (!wireguardPeerResponse.success) {
			throw new Error('Failed to add WireGuard peer', {
				cause: {
					displayName: primaryRouter.data.displayName,
					...wireguardPeerResponse
				}
			});
		}

		const commitChangesResponse = await commitWireguardChanges();
		if (!commitChangesResponse.success) {
			throw new Error('Failed to commit WireGuard changes', {
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
			errorMessage: 'Failed to add WireGuard peer',
			error
		});
		const revertResponse = await revertWireguardChanges();
		if (!revertResponse.success) {
			logError({
				errorMessage: 'Failed to revert WireGuard changes',
				...revertResponse
			});
		}
		return {
			success: false,
			errorMessage: 'Something went wrong while adding the WireGuard peer.'
		} as const;
	}
}

export async function editWireguardPeerAction({
	values,
	sectionName
}: {
	values: {
		public_key: string;
		private_key?: string;
		preshared_key?: string;
		description?: string;
		endpoint_host?: string;
		endpoint_port?: string;
		allowed_ips?: string[];
		persistent_keepalive?: string;
		route_allowed_ips?: string;
		disabled?: string;
	};
	sectionName: string;
}) {
	try {
		const parsedNewValues = wireguardPeerConfigClientSchema.safeParse(values);
		if (!parsedNewValues.success) {
			logError({
				errorMessage: 'Invalid form values while editing WireGuard peer',
				zodError: parsedNewValues.error,
				values
			});
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

		const currentConfigResponse = await ubusCall({
			displayName: primaryRouter.data.displayName,
			params: [
				'uci',
				'get',
				{
					config: 'network'
				}
			]
		});

		if (!currentConfigResponse.success) {
			logError({
				displayName: primaryRouter.data.displayName,
				errorMessage: 'Failed to get current WireGuard configuration',
				...currentConfigResponse
			});
			return {
				success: false,
				errorMessage: 'Failed to get current WireGuard configuration'
			} as const;
		}

		const configs = currentConfigResponse.data.result[1].values;
		let peerToEdit = configs[sectionName];
		if (!peerToEdit) {
			logError({
				displayName: primaryRouter.data.displayName,
				errorMessage: 'Attempted to edit WireGuard peer that does not exist',
				sectionName
			});
			return {
				success: false,
				errorMessage: 'WireGuard peer not found'
			} as const;
		}

		const oldValues = Object.entries(peerToEdit);
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
						config: 'network',
						options: deleteValues,
						section: sectionName
					}
				]
			});
			if (!deleteResponse.success) {
				throw new Error('Failed to delete WireGuard peer', {
					cause: {
						displayName: primaryRouter.data.displayName,
						...deleteResponse
					}
				});
			}
		}

		let postData: Record<string, string | string[]> = {};
		Object.entries(parsedNewValues.data).forEach(([key, value]) => {
			if (value && value !== '' && !key.startsWith('.') && value.length !== 0) {
				postData[key] = value;
			}
		});

		deleteValues.forEach((key) => {
			if (key in postData) {
				delete postData[key];
			}
		});

		if (Object.keys(postData).length > 0) {
			const wireguardPeerResponse = await ubusCall({
				displayName: primaryRouter.data.displayName,
				params: [
					'uci',
					'set',
					{
						config: 'network',
						section: sectionName,
						values: postData
					}
				]
			});
			if (!wireguardPeerResponse.success) {
				throw new Error('Failed to edit WireGuard peer', {
					cause: {
						displayName: primaryRouter.data.displayName,
						...wireguardPeerResponse
					}
				});
			}
		}

		const commitChangesResponse = await commitWireguardChanges();
		if (!commitChangesResponse.success) {
			throw new Error('Failed to commit WireGuard changes', {
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
			errorMessage: 'Failed to edit WireGuard peer',
			error
		});
		const revertResponse = await revertWireguardChanges();
		if (!revertResponse.success) {
			logError({
				errorMessage: 'Failed to revert WireGuard changes',
				...revertResponse
			});
		}
		return {
			success: false,
			errorMessage: 'Something went wrong while editing the WireGuard peer.'
		} as const;
	}
}

export async function deleteWireguardPeerAction({
	section_name
}: {
	section_name: string;
}) {
	try {
		const primaryRouter = await getPrimaryRouter();
		if (!primaryRouter.success) {
			return primaryRouter;
		}

		const deleteResponse = await ubusCall({
			displayName: primaryRouter.data.displayName,
			params: [
				'uci',
				'delete',
				{
					config: 'network',
					options: null,
					section: section_name
				}
			]
		});

		if (!deleteResponse.success) {
			throw new Error('Failed to delete WireGuard peer', {
				cause: {
					displayName: primaryRouter.data.displayName,
					...deleteResponse
				}
			});
		}

		const commitChangesResponse = await commitWireguardChanges();
		if (!commitChangesResponse.success) {
			throw new Error('Failed to commit changes', {
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
			errorMessage: 'Failed to delete WireGuard peer',
			error
		});
		const revertResponse = await revertWireguardChanges();
		if (!revertResponse.success) {
			logError({
				errorMessage: 'Failed to revert WireGuard changes',
				...revertResponse
			});
		}
		return {
			success: false,
			errorMessage: 'Something went wrong while deleting the WireGuard peer.'
		} as const;
	}
}

async function commitWireguardChanges() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return {
			success: false,
			errorMessage: 'Failed to commit WireGuard changes.'
		} as const;
	}

	const commitResponse = await ubusCall({
		displayName: primaryRouter.data.displayName,
		params: [
			'uci',
			'commit',
			{
				config: 'network'
			}
		],
		attemptRetry: false
	});

	if (!commitResponse.success) {
		return {
			...commitResponse
		} as const;
	}

	return {
		...commitResponse
	} as const;
}

async function revertWireguardChanges() {
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
				config: 'network'
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

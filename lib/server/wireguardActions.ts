'use server';
import 'server-only';
import { ubusCall } from './ubusCalls';
import { getPrimaryRouter } from './router';

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
			throw new Error('Failed to delete WireGuard peer');
		}

		const commitChangesResponse = await commitWireguardChanges();
		if (!commitChangesResponse.success) {
			throw new Error('Failed to commit changes');
		}

		return {
			success: true,
			data: commitChangesResponse.data
		} as const;
	} catch (error) {
		console.error('[ERROR] Failed to delete WireGuard peer:', error);
		await revertWireguardChanges();
		return {
			success: false,
			error:
				'Something went wrong while deleting the WireGuard peer. Please see logs for more details'
		} as const;
	}
}

async function commitWireguardChanges() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return {
			success: false,
			error:
				'Failed to commit WireGuard changes. Please see logs for more details'
		};
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
			success: false,
			error: commitResponse.error
		};
	}

	return {
		success: true,
		data: commitResponse.data
	} as const;
}

async function revertWireguardChanges() {
	const primaryRouter = await getPrimaryRouter();
	if (!primaryRouter.success) {
		return {
			success: false,
			error: 'Failed to find router'
		};
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
			success: false,
			error: revertResponse.error
		} as const;
	}

	return {
		success: true,
		data: revertResponse.data
	} as const;
}

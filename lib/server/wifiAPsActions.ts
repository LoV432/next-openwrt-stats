'use server';
import 'server-only';
import { getRouter } from './router';
import { ubusCall } from './ubusCalls';
import { wifiAPUpdateFormServer } from '@/types/ubusCalls';
import { logError } from '../client/errorLog';

export async function disableWifiAPAction({
	displayName,
	configSection
}: {
	displayName: string;
	configSection: string;
}) {
	try {
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
			logError({
				displayName: router.data.displayName,
				errorMessage: 'Failed to disable wifi AP',
				...ubusResponse
			});
			throw new Error('Something went wrong while disabling wifi AP');
		}

		const commitChangesResponse = await commitWifiChanges(
			router.data.displayName
		);

		if (!commitChangesResponse.success) {
			logError({
				displayName: router.data.displayName,
				errorMessage: 'Failed to commit changes during wifi AP update',
				...commitChangesResponse
			});
			throw new Error('Something went wrong while committing changes');
		}

		return {
			success: true
		} as const;
	} catch (error) {
		console.error(error);
		if (displayName) {
			const revertResponse = await revertWifiChanges(displayName);
			if (!revertResponse.success) {
				logError({
					errorMessage: 'Failed to revert wifi changes',
					...revertResponse
				});
			}
		}
		return {
			success: false,
			errorMessage: 'Something went wrong while disabling wifi AP.'
		} as const;
	}
}

export async function enabledWifiAPAction({
	displayName,
	configSection
}: {
	displayName: string;
	configSection: string[];
}) {
	try {
		const router = await getRouter(displayName);
		if (!router.success) {
			return {
				success: false,
				errorMessage: 'Router not found'
			} as const;
		}

		const [delete1, delete2] = await Promise.all([
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

		if (!delete1.success || !delete2.success) {
			logError({
				displayName: router.data.displayName,
				errorMessage: 'Failed to delete keys during wifi AP update',
				delete1,
				delete2
			});
			throw new Error('Something went wrong while disabling wifi AP');
		}

		const commitChangesResponse = await commitWifiChanges(
			router.data.displayName
		);

		if (!commitChangesResponse.success) {
			logError({
				displayName: router.data.displayName,
				errorMessage: 'Failed to commit changes during wifi AP update',
				...commitChangesResponse
			});
			throw new Error('Something went wrong while committing changes');
		}

		return {
			success: true
		} as const;
	} catch (error) {
		console.error(error);
		if (displayName) {
			const revertResponse = await revertWifiChanges(displayName);
			if (!revertResponse.success) {
				logError({
					errorMessage: 'Failed to revert wifi changes',
					...revertResponse
				});
			}
		}
		return {
			success: false,
			errorMessage: 'Something went wrong while enabling wifi AP.'
		} as const;
	}
}

export async function updateWifiAPAction({ params }: { params: any }) {
	try {
		const { parentConfigSection, configSection, displayName, values } =
			wifiAPUpdateFormServer.parse(params);

		const router = await getRouter(displayName);
		if (!router.success) {
			return {
				success: false,
				errorMessage: 'Router not found'
			} as const;
		}
		const parentValues = {
			channel: values.channel,
			txpower: values.txpower,
			country: values.country
		};

		if (
			parentValues.txpower === 'delete' ||
			parentValues.country === 'delete'
		) {
			let keysToDelete: string[] = [];
			if (parentValues.txpower === 'delete') {
				keysToDelete.push('txpower');
			}
			if (parentValues.country === 'delete') {
				keysToDelete.push('country');
			}
			const deleteResponse = await ubusCall({
				displayName: router.data.displayName,
				params: [
					'uci',
					'delete',
					{
						config: 'wireless',
						options: keysToDelete,
						section: parentConfigSection
					}
				]
			});
			if (!deleteResponse.success) {
				logError({
					displayName: router.data.displayName,
					errorMessage: 'Failed to delete parent section during wifi AP update',
					...deleteResponse
				});
				throw new Error(
					'Something went wrong while deleting the parent section.',
					{
						cause: deleteResponse.error
					}
				);
			}
		}

		const parentKeysToUpdate = Object.keys(parentValues).filter((key) => {
			return parentValues[key as keyof typeof parentValues] !== 'delete';
		});

		if (parentKeysToUpdate.length > 0) {
			let values: {
				[key: string]: string;
			} = {};
			parentKeysToUpdate.forEach((key) => {
				values[key] = parentValues[key as keyof typeof parentValues];
			});
			const updateResponse = await ubusCall({
				displayName: router.data.displayName,
				params: [
					'uci',
					'set',
					{
						config: 'wireless',
						section: parentConfigSection,
						values
					}
				]
			});
			if (!updateResponse.success) {
				logError({
					displayName: router.data.displayName,
					errorMessage: 'Failed to update parent section during wifi AP update',
					...updateResponse
				});
				throw new Error(
					'Something went wrong while updating the parent section.',
					{
						cause: updateResponse.error
					}
				);
			}
		}

		const childKeys = {
			ssid: values.ssid,
			key: values.password,
			hidden: values.hidden === '1' ? '1' : '0'
		};

		if (values.password === '' || values.password === undefined) {
			const deleteResponse = await ubusCall({
				displayName: router.data.displayName,
				params: [
					'uci',
					'delete',
					{
						config: 'wireless',
						options: ['key'],
						section: configSection
					}
				]
			});
			if (!deleteResponse.success) {
				logError({
					displayName: router.data.displayName,
					errorMessage: 'Failed to delete key during wifi AP update',
					...deleteResponse
				});
				throw new Error('Something went wrong while deleting the key.', {
					cause: deleteResponse.error
				});
			}
		}

		const childKeysToUpdate = Object.keys(childKeys).filter((key) => {
			return (
				childKeys[key as keyof typeof childKeys] !== '' &&
				childKeys[key as keyof typeof childKeys] !== undefined
			);
		});

		if (childKeysToUpdate.length > 0) {
			let values: {
				[key: string]: string | undefined;
			} = {};
			childKeysToUpdate.forEach((key) => {
				values[key] = childKeys[key as keyof typeof childKeys];
			});
			const updateAP = await ubusCall({
				displayName: router.data.displayName,
				params: [
					'uci',
					'set',
					{
						config: 'wireless',
						section: configSection,
						values
					}
				]
			});
			if (!updateAP.success) {
				logError({
					displayName: router.data.displayName,
					errorMessage: 'Failed to update child section during wifi AP update',
					...updateAP
				});
				throw new Error(
					'Something went wrong while updating the child section.',
					{
						cause: updateAP.error
					}
				);
			}
		}

		const commitChangesResponse = await commitWifiChanges(
			router.data.displayName
		);
		if (!commitChangesResponse.success) {
			logError({
				displayName: router.data.displayName,
				errorMessage: 'Failed to commit changes during wifi AP update',
				...commitChangesResponse
			});
			throw new Error('Something went wrong while committing the changes.');
		}

		return {
			success: true,
			data: 'AP updated successfully!'
		} as const;
	} catch (error) {
		console.log(error);
		if (params?.displayName && params.displayName !== '') {
			const revertResponse = await revertWifiChanges(params.displayName);
			if (!revertResponse.success) {
				logError({
					errorMessage: 'Failed to revert wifi changes',
					...revertResponse
				});
			}
		}
		return {
			success: false,
			errorMessage: 'Something went wrong while updating the AP.'
		} as const;
	}
}

async function commitWifiChanges(router: string) {
	const primaryRouter = await getRouter(router);
	if (!primaryRouter.success) {
		return {
			success: false,
			errorMessage: 'Failed to find router'
		} as const;
	}

	const commitChangesResponse = await ubusCall({
		displayName: primaryRouter.data.displayName,
		params: [
			'uci',
			'commit',
			{
				config: 'wireless'
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

async function revertWifiChanges(router: string) {
	const primaryRouter = await getRouter(router);
	if (!primaryRouter.success) {
		return {
			success: false,
			errorMessage: 'Failed to find router'
		};
	}

	const revertResponse = await ubusCall({
		displayName: primaryRouter.data.displayName,
		params: [
			'uci',
			'revert',
			{
				config: 'wireless'
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

'use server';
import 'server-only';
import { getRouter } from './router';
import { ubusCall } from './ubusCalls';
import { wifiAPUpdateFormServer } from '@/types/ubusCalls';

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
			throw new Error('Something went wrong while disabling wifi AP');
		}

		const commitChangesResponse = await commitWifiChanges(
			router.data.displayName
		);

		if (!commitChangesResponse.success) {
			throw new Error('Something went wrong while committing changes', {
				cause: commitChangesResponse.error
			});
		}

		return {
			success: true,
			data: true
		} as const;
	} catch (error) {
		console.error(error);
		if (displayName) {
			await revertWifiChanges(displayName);
		}
		return {
			success: false,
			error:
				'Something went wrong while disabling wifi AP. Please see logs for more details' as string
		};
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
				error: 'Router not found'
			} as const;
		}

		const [delte1, delete2] = await Promise.all([
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

		if (!delte1.success || !delete2.success) {
			throw new Error('Something went wrong while disabling wifi AP');
		}

		const commitChangesResponse = await commitWifiChanges(
			router.data.displayName
		);

		if (!commitChangesResponse.success) {
			throw new Error('Something went wrong while committing changes', {
				cause: commitChangesResponse.error
			});
		}

		return {
			success: true,
			data: true
		} as const;
	} catch (error) {
		console.error(error);
		if (displayName) {
			await revertWifiChanges(displayName);
		}
		return {
			success: false,
			error:
				'Something went wrong while enabling wifi AP. Please see logs for more details' as string
		};
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
				error: 'Router not found'
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
				throw new Error(
					'Something went wrong while deleting the parent section. Please see logs for more details',
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
				throw new Error(
					'Something went wrong while updating the parent section. Please see logs for more details',
					{
						cause: updateResponse.error
					}
				);
			}
		}

		const childKeys = {
			ssid: values.ssid,
			key: values.password,
			hidden: values.hidden ? '1' : '0'
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
				throw new Error(
					'Something went wrong while deleting the key. Please see logs for more details',
					{
						cause: deleteResponse.error
					}
				);
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
				throw new Error(
					'Something went wrong while updating the child section. Please see logs for more details',
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
			throw new Error(
				'Something went wrong while committing the changes. Please see logs for more details',
				{ cause: commitChangesResponse.error }
			);
		}

		return {
			success: true,
			data: 'AP updated successfully!'
		} as const;
	} catch (error) {
		console.log('Update AP Error: ', error);
		if (params?.displayName && params.displayName !== '') {
			await revertWifiChanges(params.displayName);
		}
		return {
			success: false,
			error:
				'Something went wrong while updating the AP. Please see logs for more details'
		} as const;
	}
}

async function commitWifiChanges(router: string) {
	const primaryRouter = await getRouter(router);
	if (!primaryRouter.success) {
		return {
			success: false,
			error: 'Failed to find router'
		};
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
			success: false,
			error: commitChangesResponse.error
		} as const;
	}

	return {
		success: true,
		data: commitChangesResponse.data
	} as const;
}

async function revertWifiChanges(router: string) {
	const primaryRouter = await getRouter(router);
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
				config: 'wireless'
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
		data: 'Changes reverted successfully!'
	} as const;
}

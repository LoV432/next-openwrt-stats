'use client';

import { useEffect } from 'react';
import {
	useUpdateManager,
	buildStatusEnum
} from '@/providers/updateManagerContext';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import {
	AlertCircle,
	CheckCircle,
	Clock,
	RefreshCw,
	Edit,
	HardDrive,
	CloudDownloadIcon
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Routers } from '@/lib/server/router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BuildAndStatusResponse } from '@/app/api/routers/update/build/route';
import { RouterUpdateInfo } from '@/app/api/routers/update/check/route';
import { checkRouterStatusAction } from '@/lib/server/routersActions';
import { logError } from '@/lib/client/errorLog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { FirmwareUpdateExecuteResponse } from '@/app/api/routers/update/execute/route';
import { UploadFirmwareResponse } from '@/app/api/routers/update/upload/route';

export function UpdateManagerModal({
	dialogState
}: {
	dialogState: {
		isOpen: boolean;
		setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
	};
}) {
	const allRouters = useQuery({
		queryKey: ['getRouters'],
		queryFn: async () => {
			const response = await fetch('/api/routers/all');
			const data = (await response.json()) as Routers;
			if (!data.success) {
				throw new Error(data.errorMessage);
			}
			if (!data.data || data.data.length === 0) {
				throw new Error('No routers found');
			}
			return data.data;
		},
		refetchOnWindowFocus: false,
		refetchOnMount: false
	});

	return (
		<Dialog open={dialogState.isOpen} onOpenChange={dialogState.setIsOpen}>
			<DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Update Manager</DialogTitle>
					<DialogDescription>
						Check for and install OpenWrt updates across all your routers
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="grid gap-4">
						{allRouters?.data?.map((router) => (
							<UpdateManager
								key={router.displayName}
								router={router.displayName}
							/>
						))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function UpdateManager({ router }: { router: string }) {
	const { getRouterState, dispatch } = useUpdateManager();
	const { buildStatus, flashModalOpen, error, packages, packageText } =
		getRouterState(router);
	const checkUpdate = useQuery({
		queryKey: ['getRouterUpdateStatus', router],
		queryFn: async () => {
			const response = await fetch(
				`/api/routers/update/check?displayName=${router}`
			);
			if (!response.ok) {
				throw new Error('Failed to get update status');
			}
			const data = (await response.json()) as RouterUpdateInfo;
			if (!data.success) {
				throw new Error('Failed to get update status');
			}
			return data.data;
		},
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		staleTime: Infinity
	});

	useEffect(() => {
		if (
			checkUpdate.data &&
			checkUpdate.data.packages &&
			checkUpdate.data.packages.length > 0 &&
			packages.length === 0
		) {
			dispatch({
				router,
				type: 'updatePackages',
				value: checkUpdate.data.packages
			});
			dispatch({
				router,
				type: 'updatePackageText',
				value: checkUpdate.data.packages.join('\n')
			});
		}
	}, [checkUpdate.data, router]);

	function savePackageEditor(packageText: string) {
		const newPackages = packageText
			.split('\n')
			.map((pkg) => pkg.trim())
			.filter((pkg) => pkg.length > 0);
		dispatch({ router, type: 'updatePackages', value: newPackages });
		dispatch({
			router,
			type: 'updatePackageText',
			value: newPackages.join('\n')
		});
	}

	function handleErrorCause(log: any) {
		try {
			return JSON.stringify(JSON.parse(log), null, 2);
		} catch {
			return JSON.stringify(log, null, 2);
		}
	}

	const firmwareBuildRequest = useMutation({
		mutationKey: ['firmwareBuildRequest', router],
		mutationFn: async ({
			buildRequestHash,
			updateInfo
		}: {
			buildRequestHash: string | undefined;
			updateInfo: typeof checkUpdate.data;
		}) => {
			if (!buildRequestHash && updateInfo) {
				const response = await fetch(`/api/routers/update/build`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(updateInfo)
				});
				const data = (await response.json()) as BuildAndStatusResponse;
				if (!data.success) {
					throw new Error(data.errorMessage, {
						cause: data.errorDetails
					});
				}
				return data.data;
			} else {
				const response = await fetch(`/api/routers/update/status`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						requestHash: buildRequestHash
					})
				});
				const data = (await response.json()) as BuildAndStatusResponse;
				if (!data.success) {
					throw new Error(data.errorMessage, {
						cause: data.errorDetails
					});
				}
				return data.data;
			}
		}
	});

	const uploadBuild = useMutation({
		mutationKey: ['uploadUpdate', router],
		mutationFn: async ({
			buildStatus,
			routerUpdateInfo,
			displayName
		}: {
			buildStatus: typeof firmwareBuildRequest.data;
			routerUpdateInfo: typeof checkUpdate.data;
			displayName: string;
		}) => {
			const response = await fetch(`/api/routers/update/upload`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					displayName,
					buildStatus,
					routerUpdateInfo
				})
			});
			const data = (await response.json()) as UploadFirmwareResponse;
			if (!data.success) {
				throw new Error(data.errorMessage);
			}
			return data;
		}
	});

	async function requestAndUploadFirmware() {
		if (!checkUpdate.data) {
			return;
		}
		try {
			dispatch({ router, type: 'updateStatus', value: 202 });
			let buildRequest = await firmwareBuildRequest.mutateAsync({
				buildRequestHash: undefined,
				updateInfo: {
					...checkUpdate.data,
					packages: packages
				}
			});
			let buildStatus = buildRequest.status;
			dispatch({ router, type: 'updateStatus', value: buildStatus });
			while (buildStatus === buildStatusEnum.building) {
				buildRequest = await firmwareBuildRequest.mutateAsync({
					buildRequestHash: buildRequest.request_hash,
					updateInfo: undefined
				});
				buildStatus = buildRequest.status;
				await new Promise((resolve) => setTimeout(resolve, 5000));
			}
			dispatch({ router, type: 'updateStatus', value: buildStatus });

			await uploadBuild.mutateAsync({
				buildStatus: buildRequest,
				routerUpdateInfo: checkUpdate.data,
				displayName: router
			});

			dispatch({
				router,
				type: 'updateStatus',
				value: buildStatusEnum.ready_to_flash
			});
		} catch (error: any) {
			dispatch({ router, type: 'updateStatus', value: buildStatusEnum.failed });
			logError({
				displayName: router,
				errorMessage: 'Firmware build or upload failed',
				error
			});
			if (error?.message) {
				dispatch({
					router,
					type: 'updateError',
					value: {
						message: error.message,
						cause: error?.cause
					}
				});
			} else {
				dispatch({
					router,
					type: 'updateError',
					value: {
						message: 'Failed to build or upload firmware'
					}
				});
			}
		}
	}

	const executeUpdateQuery = useMutation({
		mutationKey: ['executeUpdate', router],
		mutationFn: async () => {
			const response = await fetch(`/api/routers/update/execute`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					displayName: router
				})
			});
			if (!response.ok) {
				throw new Error('Failed to get build update');
			}
			const data = (await response.json()) as FirmwareUpdateExecuteResponse;
			return data;
		}
	});

	const downloadBackup = useMutation({
		mutationKey: ['downloadBackup', router],
		mutationFn: async () => {
			const response = await fetch(`/api/routers/update/backup`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					displayName: router
				})
			});
			if (!response.ok) {
				throw new Error('Failed to download backup', {
					cause: response.body
				});
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${router.replaceAll(' ', '_')}-backup.tar.gz`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
		}
	});

	async function executeUpdate() {
		try {
			dispatch({
				router,
				type: 'updateStatus',
				value: buildStatusEnum.flashing
			});
			try {
				const response = await executeUpdateQuery.mutateAsync();
				if (!response.success) {
					dispatch({
						router,
						type: 'updateStatus',
						value: buildStatusEnum.failed
					});
					logError({
						displayName: router,
						errorMessage: 'Failed to execute update',
						error: response.errorMessage
					});
					return;
				}
			} catch {
				// There is no way to gurantee that this means the request failed.
				// The router going offline to update could be the reason of this failing.
			}
			let tries = 0;
			let routerStatus;
			while (tries < 20) {
				await new Promise((resolve) => setTimeout(resolve, 5000));
				try {
					routerStatus = await checkRouterStatusAction(router);
					if (routerStatus.success) {
						break;
					}
				} catch {
					// There is no way to gurantee that this means the request failed.
					// The router going offline to update could be the reason of this failing.
				} finally {
					tries++;
				}
			}
			if (!routerStatus || !routerStatus.success) {
				throw new Error('Failed to get router status');
			}
			dispatch({
				router,
				type: 'updateStatus',
				value: buildStatusEnum.flashed
			});
			dispatch({ router, type: 'updateFlashModalOpen', value: false });
			await resetAllQueries();
			dispatch({
				router,
				type: 'updateStatus',
				value: buildStatusEnum.initial
			});
		} catch (error: any) {
			dispatch({ router, type: 'updateStatus', value: buildStatusEnum.failed });
			logError({
				displayName: router,
				errorMessage: 'Failed to execute update',
				error
			});
			if (error?.message) {
				dispatch({
					router,
					type: 'updateError',
					value: { message: error.message, cause: error?.cause }
				});
			} else {
				dispatch({
					router,
					type: 'updateError',
					value: { message: 'Failed to flash firmware.' }
				});
			}
		}
	}

	async function resetAllQueries() {
		firmwareBuildRequest.reset();
		uploadBuild.reset();
		executeUpdateQuery.reset();
		downloadBackup.reset();
		await checkUpdate.refetch();
	}

	if (!checkUpdate.data) {
		return (
			<Card className="p-0">
				<CardContent className="px-5 py-3">
					<div className="text-base">{router}</div>
					<div className="text-muted-foreground pb-2 text-sm">
						Checking for updates...
					</div>
					<Button
						size={'lg'}
						disabled={checkUpdate.isFetching}
						onClick={() => checkUpdate.refetch()}
						variant={'outline'}
						className="flex items-center justify-center gap-1 font-semibold"
					>
						<RefreshCw
							className={`h-4 w-4 ${checkUpdate.isFetching ? 'animate-spin' : ''}`}
						/>
						Check for updates
					</Button>
					<Button
						onClick={() => downloadBackup.mutate()}
						disabled={downloadBackup.isPending}
						variant="outline"
						className="mt-2 flex items-center justify-center font-semibold"
						size={'lg'}
					>
						<HardDrive className="h-4 w-4" />
						{downloadBackup.isPending ? 'Generating...' : 'Download Backup'}
					</Button>
				</CardContent>
			</Card>
		);
	}

	if (!checkUpdate.data.hasUpdate) {
		return (
			<Card className="p-0">
				<CardContent className="px-5 py-3">
					<div className="text-base">{router}</div>
					{checkUpdate.data.isSnapshot ? (
						<div className="flex items-center gap-1 pb-2 text-sm text-red-600">
							Snapshots are not supported -{' '}
							<span className="font-bold">
								v{checkUpdate.data.currentVersion}
							</span>
						</div>
					) : (
						<div className="text-muted-foreground flex items-center gap-1 pb-2 text-sm">
							No updates available -{' '}
							<span className="font-bold">
								v{checkUpdate.data.currentVersion}
							</span>
						</div>
					)}
					<Button
						size={'lg'}
						disabled={checkUpdate.isFetching || checkUpdate.data.isSnapshot}
						onClick={() => checkUpdate.refetch()}
						variant={'outline'}
						className="flex items-center justify-center gap-1 font-semibold"
					>
						<RefreshCw
							className={`h-4 w-4 ${checkUpdate.isFetching ? 'animate-spin' : ''}`}
						/>
						Check for updates
					</Button>
					<Button
						onClick={() => downloadBackup.mutate()}
						disabled={downloadBackup.isPending}
						variant="outline"
						className="mt-2 flex items-center justify-center font-semibold"
						size={'lg'}
					>
						<HardDrive className="h-4 w-4" />
						{downloadBackup.isPending ? 'Downloading...' : 'Download Backup'}
					</Button>
				</CardContent>
			</Card>
		);
	}

	const updateData = checkUpdate.data;

	return (
		<Card className="p-0">
			<CardContent className="px-5 py-3">
				<div className="text-base">{router}</div>
				<div className="text-muted-foreground pb-2 text-sm">
					Current:{' '}
					<span className="font-bold">{updateData.currentVersion}</span> →
					Latest: <span className="font-bold">{updateData.latestVersion}</span>
				</div>
				<div>
					{(buildStatus === buildStatusEnum.initial ||
						buildStatus === buildStatusEnum.building ||
						buildStatus === buildStatusEnum.uploading) && (
						<div className="flex flex-wrap-reverse items-center gap-2">
							<Button
								disabled={
									firmwareBuildRequest.isPending ||
									buildStatus !== buildStatusEnum.initial
								}
								onClick={() => requestAndUploadFirmware()}
								size={'lg'}
								className="flex items-center justify-center gap-1 font-semibold"
							>
								<Clock className="h-4 w-4" />
								{buildStatusToText(buildStatus)}
							</Button>
							{buildStatus === buildStatusEnum.initial && (
								<Dialog
									onOpenChange={(state) => {
										if (state) {
											dispatch({
												router,
												type: 'updatePackageText',
												value: packages.join('\n')
											});
										}
									}}
								>
									<DialogTrigger asChild>
										<Button variant={'ghost'}>
											<Edit className="mr-1 h-4 w-4" />
											<span className="text-sm font-medium">
												Packages ({packages.length})
											</span>
										</Button>
									</DialogTrigger>
									<DialogContent className="max-w-2xl">
										<DialogHeader>
											<DialogTitle>Edit Packages</DialogTitle>
											<DialogDescription>
												Edit the package list (one package per line)
											</DialogDescription>
										</DialogHeader>
										<div className="space-y-4">
											<Textarea
												spellCheck={false}
												value={packageText}
												onChange={(e) =>
													dispatch({
														router,
														type: 'updatePackageText',
														value: e.target.value
													})
												}
												placeholder="Enter package names, one per line..."
												className="min-h-[300px] font-mono"
											/>
											<div className="flex flex-wrap justify-end gap-2">
												<DialogClose asChild>
													<Button variant="outline">Cancel</Button>
												</DialogClose>
												<Button
													variant={'outline'}
													onClick={() => {
														dispatch({
															router,
															type: 'updatePackageText',
															value: checkUpdate.data.packages.join('\n')
														});
													}}
												>
													Reset Packages
												</Button>
												<DialogClose asChild>
													<Button
														onClick={() => savePackageEditor(packageText)}
													>
														Save Packages
													</Button>
												</DialogClose>
											</div>
										</div>
									</DialogContent>
								</Dialog>
							)}
						</div>
					)}
					{(buildStatus === buildStatusEnum.ready_to_flash ||
						buildStatus === buildStatusEnum.flashing) && (
						<AlertDialog
							open={flashModalOpen}
							onOpenChange={(state) => {
								if (buildStatus === buildStatusEnum.flashing) {
									return;
								}
								dispatch({
									router,
									type: 'updateFlashModalOpen',
									value: state
								});
							}}
						>
							<AlertDialogTrigger asChild>
								<Button
									onClick={() =>
										dispatch({
											router,
											type: 'updateFlashModalOpen',
											value: true
										})
									}
									className="flex items-center justify-center gap-1 font-semibold"
								>
									<CheckCircle className="h-4 w-4" />
									{buildStatusToText(buildStatus)}
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Flash Firmware - {router}</AlertDialogTitle>
									<AlertDialogDescription>
										Are you sure you want to flash{' '}
										{checkUpdate.data.latestVersion} firmware to {router}?
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction asChild>
										<Button
											disabled={
												buildStatus === buildStatusEnum.flashing ||
												executeUpdateQuery.isPending
											}
											onClick={(event) => {
												event.preventDefault();
												executeUpdate();
											}}
											variant="destructive"
											className="text-white"
										>
											{buildStatusToText(buildStatus)}
										</Button>
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
					{buildStatus === buildStatusEnum.flashed && (
						<Button
							disabled={true}
							variant={'default'}
							className="flex items-center justify-center gap-1 font-semibold"
							size={'lg'}
						>
							<CheckCircle className="h-4 w-4" />
							{buildStatusToText(buildStatus)}
						</Button>
					)}
					{buildStatus === buildStatusEnum.failed && (
						<>
							<Button
								disabled={true}
								variant={'destructive'}
								className="flex items-center justify-center gap-1 font-semibold text-white"
								size={'lg'}
							>
								<AlertCircle className="h-4 w-4" />
								{buildStatusToText(buildStatus)}
							</Button>
							<div className="mt-1 flex items-center gap-1">
								<div className="text-red-600">{error.message}</div>
								{error.cause && (
									<Dialog>
										<DialogTrigger asChild>
											<span className="cursor-pointer text-red-600 underline">
												View Details
											</span>
										</DialogTrigger>
										<DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
											<DialogHeader>
												<DialogTitle>Error Details</DialogTitle>
												<DialogDescription>
													This *probably* came from sysupgrade.openwrt.org
												</DialogDescription>
											</DialogHeader>
											{error.cause && (
												<pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-stone-800 p-2 text-sm">
													{handleErrorCause(error.cause)}
												</pre>
											)}
										</DialogContent>
									</Dialog>
								)}
							</div>
						</>
					)}
					<Button
						onClick={() => downloadBackup.mutate()}
						disabled={downloadBackup.isPending}
						variant="outline"
						className="mt-2 flex items-center justify-center font-semibold"
						size={'lg'}
					>
						<HardDrive className="h-4 w-4" />
						{downloadBackup.isPending ? 'Downloading...' : 'Download Backup'}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function buildStatusToText(status: number) {
	switch (status) {
		case buildStatusEnum.building:
			return 'Building...';
		case buildStatusEnum.uploading:
			return 'Uploading...';
		case buildStatusEnum.ready_to_flash:
			return 'Install Firmware';
		case buildStatusEnum.flashing:
			return 'Flashing...';
		case buildStatusEnum.flashed:
			return 'Firmware Flash Complete';
		case buildStatusEnum.failed:
			return 'Build Failed';
		case buildStatusEnum.initial:
			return 'Build & Upload Firmware';
		default:
			return 'Unknown Status';
	}
}

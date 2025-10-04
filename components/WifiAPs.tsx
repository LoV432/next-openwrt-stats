'use client';

import {
	disableWifiAPAction,
	enabledWifiAPAction
} from '@/lib/server/wifiAPsActions';
import { type WifiAPs } from '@/lib/server/wifiAPs';
import { Card, CardContent, CardHeader } from './ui/card';
import { LoaderCircle, Settings2, WifiIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';
import { useState } from 'react';
import { toast } from 'sonner';
import { EditWifiAPModel } from './EditWifiAP';
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
import { useWifiAPsQuery } from '@/providers/wifiAPsContext';

export function WifiAPs() {
	const wifiAPs = useWifiAPsQuery();

	if (wifiAPs.isError) {
		return (
			<div className="w-fullpy-4">
				<div className="grid h-44 w-full place-items-center text-xl">
					<div className="flex h-full w-full flex-col items-center justify-center">
						Error: {wifiAPs.error?.message}
					</div>
				</div>
			</div>
		);
	}

	if (wifiAPs.isLoading) {
		return (
			<div className="w-full py-4">
				<div className="grid h-44 w-full place-items-center text-xl">
					<div className="flex h-full w-full flex-col items-center justify-center">
						<LoaderCircle className="h-12 w-12 animate-spin" />
					</div>
				</div>
			</div>
		);
	}

	if (wifiAPs.data && Object.keys(wifiAPs.data.wifiAPsPerSSID).length === 0) {
		return <></>;
	}

	return (
		<div className="w-full border-zinc-800">
			<div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
				{wifiAPs.data &&
					Object.entries(wifiAPs.data.wifiAPsOverview).map(([ssid, data]) => (
						<Card key={ssid} className="w-full gap-4">
							<CardHeader>
								<h3 className="flex text-lg font-semibold">
									<WifiIcon className="mb-1 mr-2 inline-block" /> {ssid}
									<div className="ml-auto">
										<DetailedWifiAPs
											allAPsWithSameSSID={wifiAPs.data.wifiAPsPerSSID[ssid]}
											ssid={ssid}
											refetchWifiAPs={wifiAPs.refetch}
										/>
									</div>
								</h3>
								<p>{data.displayName.join(' / ')}</p>
							</CardHeader>
							<CardContent>
								<div className="space-y-2 text-sm">
									<p className="flex justify-between">
										<span className="text-muted-foreground">Channel:</span>
										<span>
											{data.channel.filter((value) => value !== 0).join(' / ')}
										</span>
									</p>
									<p className="flex justify-between">
										<span className="text-muted-foreground">Band:</span>
										<span>
											{data.band
												.join(' / ')
												.replace('2g', '2.4')
												.replace('5g', '5')}{' '}
											GHz
										</span>
									</p>
									<p className="flex justify-between">
										<span className="text-muted-foreground">Width:</span>
										<span>{data.htmode.join(' / ')}</span>
									</p>
									<p className="flex justify-between">
										<span className="text-muted-foreground">Power:</span>
										<span>
											{data.txpower.filter((value) => value !== 0).join(' / ')}{' '}
											dBm
										</span>
									</p>
									<p className="flex justify-between">
										<span className="text-muted-foreground">Bitrate</span>
										<span>
											{data.bitrate.length > 0 ? (
												data.bitrate.map((value) => value / 1000).join(' / ')
											) : (
												<>- - -</>
											)}{' '}
											Mbit/s
										</span>
									</p>
								</div>
							</CardContent>
						</Card>
					))}
			</div>
		</div>
	);
}

function DetailedWifiAPs({
	allAPsWithSameSSID,
	ssid,
	refetchWifiAPs
}: {
	allAPsWithSameSSID: {
		configSection: string;
		parentConfigSection: string;
		displayName: string;
		channel: number;
		band: string;
		htmode: string;
		txpower: number;
		bitrate?: number;
		disabled?: boolean;
	}[];
	ssid: string;
	refetchWifiAPs: () => Promise<any>;
}) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" size={'sm'}>
					<Settings2 className="h-5 w-5" />
				</Button>
			</DialogTrigger>
			<DialogContent className="h-[80vh] sm:max-w-[700px]">
				<DialogHeader>
					<DialogTitle>Details for {ssid}</DialogTitle>
				</DialogHeader>

				<div className="w-full overflow-y-auto py-4">
					<div className="flex w-full flex-col gap-4">
						{allAPsWithSameSSID &&
							allAPsWithSameSSID.map((wifiInterface, idx) => (
								<div
									key={
										wifiInterface.displayName +
										wifiInterface.channel +
										wifiInterface.band +
										wifiInterface.htmode +
										wifiInterface.txpower +
										idx
									}
									className="bg-card w-full rounded-md border px-3 py-3"
								>
									<div className="flex flex-col gap-3 md:flex-row md:items-center">
										<div className="flex-shrink-0">
											<div className="bg-muted rounded-md p-2">
												<WifiIcon className="text-muted-foreground h-5 w-5" />
											</div>
										</div>
										<div className="flex min-w-0 flex-1 flex-col">
											<div className="flex items-center justify-between gap-2">
												<div className="truncate">
													<div className="flex items-center gap-2">
														<span className="truncate text-lg font-semibold">
															{ssid}
														</span>
														<span className="text-muted-foreground truncate text-sm">
															on {wifiInterface.displayName}
														</span>
													</div>
												</div>
											</div>
											<div className="text-muted-foreground mt-1 text-sm md:mt-0">
												Channel: {wifiInterface.channel} · Band:{' '}
												{wifiInterface.band} · Width: {wifiInterface.htmode}
											</div>
											<div className="text-muted-foreground mt-1 text-sm">
												Bitrate:{' '}
												{wifiInterface.bitrate
													? wifiInterface.bitrate / 1000
													: '?'}{' '}
												Mbit/s · Power: {wifiInterface.txpower} dBm
											</div>
										</div>
										<div className="ml-auto mt-3 flex flex-wrap items-center gap-2 md:ml-4 md:mt-0">
											<EnableDisableWifiAP
												displayName={wifiInterface.displayName}
												configSection={wifiInterface.configSection}
												parentConfigSection={wifiInterface.parentConfigSection}
												disabled={wifiInterface.disabled ? true : false}
												refetchWifiAPs={refetchWifiAPs}
											/>
											<EditWifiAPModel
												{...wifiInterface}
												refreshWifiAPs={refetchWifiAPs}
											/>
											{/* <Button variant="destructive" size="sm">
													Remove
												</Button> */}
										</div>
									</div>
								</div>
							))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function EnableDisableWifiAP({
	displayName,
	configSection,
	parentConfigSection,
	disabled,
	refetchWifiAPs
}: {
	displayName: string;
	configSection: string;
	parentConfigSection: string;
	disabled: boolean;
	refetchWifiAPs: () => Promise<any>;
}) {
	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);

	async function disableEnabledWifiAP() {
		setIsLoading(true);
		try {
			let response;
			if (disabled) {
				response = await enabledWifiAPAction({
					displayName,
					configSection: [configSection, parentConfigSection]
				});
			} else {
				response = await disableWifiAPAction({
					displayName,
					configSection: configSection
				});
			}
			await refetchWifiAPs();
			if (response.success) {
				toast.success(
					`Successfully ${disabled ? 'enabled' : 'disabled'} WiFi AP`,
					{
						richColors: true
					}
				);
				setIsOpen(false);
			} else {
				toast.error(`Failed to update wifi AP: ${response.error}`, {
					richColors: true
				});
			}
		} catch (err) {
			toast.error('Something went wrong', {
				richColors: true
			});
		}
		setIsLoading(false);
	}

	function handleOpenClose(newSate: boolean) {
		if (newSate) {
			setIsOpen(true);
		} else if (!newSate && !isLoading) {
			setIsOpen(false);
		}
	}

	return (
		<AlertDialog open={isOpen} onOpenChange={handleOpenClose}>
			<AlertDialogTrigger asChild>
				<Button onClick={() => setIsOpen(true)} variant="outline">
					{disabled ? 'Enable' : 'Disable'}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{disabled ? 'Enable' : 'Disable'} - WiFi AP
					</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to {disabled ? 'enable' : 'disable'} this WiFi
						AP?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							disabled={isLoading}
							onClick={(event) => {
								event.preventDefault();
								disableEnabledWifiAP();
							}}
							variant="destructive"
							className="text-white"
						>
							{disabled ? (isLoading ? 'Enabling...' : 'Enable') : ''}
							{!disabled ? (isLoading ? 'Disabling...' : 'Disable') : ''}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

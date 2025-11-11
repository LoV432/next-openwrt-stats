'use client';
import { WifiAPEditForm } from '@/app/api/routers/wifiap/edit-info/route';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { wifiAPUpdateForm } from '@/types/ubusCalls';
import { updateWifiAPAction } from '@/lib/server/wifiAPsActions';
import { toast } from 'sonner';

export function EditWifiAPModel({
	configSection,
	parentConfigSection,
	displayName,
	refreshWifiAPs
}: {
	configSection: string;
	parentConfigSection: string;
	displayName: string;
	refreshWifiAPs: () => Promise<any>;
}) {
	const WifiAPEditForm = useQuery({
		queryKey: ['wifiEditForm', displayName, parentConfigSection, configSection],
		queryFn: async () => {
			const editFields = await fetch(
				'/api/routers/wifiap/edit-info?displayName=' +
					displayName +
					'&parentConfigSection=' +
					parentConfigSection +
					'&configSection=' +
					configSection
			).then((res) => res.json() as Promise<WifiAPEditForm>);
			return editFields;
		},
		refetchInterval: false,
		retry: 1
	});

	async function refreshData() {
		await refreshWifiAPs();
		await WifiAPEditForm.refetch();
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline" className="w-fit">
					Edit
				</Button>
			</DialogTrigger>
			<DialogContent className="flex h-fit max-h-[80vh] w-[90vw] max-w-3xl flex-col overflow-hidden">
				<DialogHeader>
					<DialogTitle>WiFi Access Point Settings</DialogTitle>
				</DialogHeader>

				{WifiAPEditForm.isLoading ||
				WifiAPEditForm.isError ||
				!WifiAPEditForm.data ? (
					<div className="grid h-full w-full place-items-center">
						<LoaderCircle className="h-12 w-12 animate-spin" />
					</div>
				) : (
					<EditWifiAP
						configSection={configSection}
						parentConfigSection={parentConfigSection}
						displayName={displayName}
						wifiAPEditForm={WifiAPEditForm.data}
						refreshData={refreshData}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function EditWifiAP({
	configSection,
	parentConfigSection,
	displayName,
	wifiAPEditForm,
	refreshData
}: {
	configSection: string;
	parentConfigSection: string;
	displayName: string;
	wifiAPEditForm: WifiAPEditForm;
	refreshData: () => Promise<any>;
}) {
	const possibleChannelList = wifiAPEditForm.wifiAPFrequencyList.filter(
		(frequency) =>
			frequency.band ===
			Number(wifiAPEditForm.wifiAPParentConfig.band.replace('g', ''))
	);
	const form = useForm({
		resolver: zodResolver(wifiAPUpdateForm),
		defaultValues: {
			ssid: wifiAPEditForm.wifiAPConfig.ssid,
			password: wifiAPEditForm.wifiAPConfig.key || '',
			channel: wifiAPEditForm.wifiAPParentConfig.channel || 'auto',
			hidden: wifiAPEditForm.wifiAPConfig.hidden === '1' ? '1' : '0',
			txpower: wifiAPEditForm.wifiAPParentConfig.txpower || 'delete',
			country: wifiAPEditForm.wifiAPParentConfig.country || 'delete'
		}
	});

	async function onSubmit(values: ReturnType<typeof wifiAPUpdateForm.parse>) {
		try {
			const response = await updateWifiAPAction({
				params: {
					displayName,
					configSection,
					parentConfigSection,
					values
				}
			});
			if (response.success) {
				await refreshData();
				toast.success('Wifi AP updated', {
					richColors: true
				});
			} else {
				toast.error(`Failed to update wifi AP: ${response.errorMessage}`, {
					richColors: true
				});
			}
		} catch (error) {
			toast.error('Something went wrong', {
				richColors: true
			});
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
				<div className="flex w-full flex-wrap gap-4">
					<FormField
						control={form.control}
						name="ssid"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormLabel className="font-medium text-white">
									WiFi SSID
								</FormLabel>
								<FormControl>
									<Input
										{...field}
										placeholder="Enter network name"
										className="w-full"
									/>
								</FormControl>
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="password"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormLabel className="font-medium text-white">
									Password
								</FormLabel>
								<FormControl>
									<Input
										{...field}
										placeholder="Enter password"
										type="password"
										className="w-full"
									/>
								</FormControl>
							</FormItem>
						)}
					/>
				</div>

				<div className="flex w-full gap-4">
					<FormField
						control={form.control}
						name="channel"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormLabel className="font-medium text-white">
									Channel
								</FormLabel>
								<FormControl>
									<select
										className="bg-input/30 border-1 w-full rounded-sm border-neutral-700 p-1.5 px-3 text-white"
										defaultValue={field.value}
										onChange={field.onChange}
									>
										<option className="text-black" value="auto">
											Auto
										</option>
										{possibleChannelList.map((channel) => (
											<option
												className="text-black"
												value={channel.channel.toString()}
												key={channel.channel}
											>
												{channel.channel}
											</option>
										))}
									</select>
								</FormControl>
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="hidden"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormLabel className="font-medium text-white">
									Wifi Visibility
								</FormLabel>
								<FormControl>
									<select
										className="bg-input/30 border-1 w-full rounded-sm border-neutral-700 p-1.5 px-3 text-white"
										defaultValue={field.value}
										onChange={field.onChange}
									>
										<option className="text-black" value="0">
											Visible
										</option>
										<option className="text-black" value="1">
											Hidden
										</option>
									</select>
								</FormControl>
							</FormItem>
						)}
					/>
				</div>

				<div className="flex gap-4">
					<FormField
						control={form.control}
						name="txpower"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormLabel className="font-medium text-white">
									TX Power
								</FormLabel>
								<FormControl>
									<select
										className="bg-input/30 border-1 w-full rounded-sm border-neutral-700 p-1.5 px-3 text-white focus:border-slate-600 focus:ring-slate-600"
										defaultValue={field.value}
										onChange={field.onChange}
									>
										<option className="text-black" value="delete">
											Driver Default
										</option>
										{wifiAPEditForm.wifiAPTxPowerList.map((wifiAPTxPower) => (
											<option
												className="text-black"
												value={wifiAPTxPower.dbm.toString()}
												key={wifiAPTxPower.dbm}
											>
												{wifiAPTxPower.dbm} dBm
											</option>
										))}
									</select>
								</FormControl>
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="country"
						render={({ field }) => (
							<FormItem className="flex-1">
								<FormLabel className="font-medium text-white">
									Country
								</FormLabel>
								<FormControl>
									<select
										className="bg-input/30 border-1 w-full rounded-sm border-neutral-700 p-1.5 px-3 text-white"
										defaultValue={field.value}
										onChange={field.onChange}
									>
										<option className="text-black" value="delete">
											Driver Default
										</option>
										{wifiAPEditForm.wifiAPCountryList.map((wifiAPCountry) => (
											<option
												className="text-black"
												value={wifiAPCountry.code}
												key={wifiAPCountry.code}
											>
												{wifiAPCountry.country}
											</option>
										))}
									</select>
								</FormControl>
							</FormItem>
						)}
					/>
				</div>

				<Button
					type="submit"
					className="w-full"
					disabled={form.formState.isSubmitting}
				>
					{form.formState.isSubmitting ? 'Saving...' : 'Save'}
				</Button>
			</form>
		</Form>
	);
}

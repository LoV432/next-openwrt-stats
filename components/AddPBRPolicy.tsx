'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { editPBRPolicy, setPBRPolicy } from '@/lib/server/pbrCalls';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from '@/components/ui/accordion';
import { PBRIcon } from './PBRIcons';
import { toast } from 'sonner';
import {
	addPolicyForm,
	addPolicyFormClient,
	PbrPolicy
} from '@/types/ubusCalls';
import { PencilLine } from 'lucide-react';

type FormValues = z.infer<typeof addPolicyFormClient>;

export function AddEditRule({
	supportedProtocols,
	interfaces,
	refetchPolicies,
	policy,
	initialValues
}: {
	supportedProtocols: string[];
	interfaces: string[];
	refetchPolicies: () => Promise<any>;
	policy?: string;
	initialValues?: PbrPolicy;
}) {
	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);

	const form = useForm<FormValues>({
		resolver: zodResolver(addPolicyFormClient),
		defaultValues: {
			name: '',
			enabled: '1',
			interface: interfaces[0],
			predefinedDstAddr: [],
			chain: 'prerouting',
			proto: supportedProtocols[0]
		}
	});

	useEffect(() => {
		if (initialValues) {
			const predefinedDstAddr = initialValues.dest_addr
				?.split(' ')
				.filter((addr) =>
					addr.startsWith(
						'https://raw.githubusercontent.com/LoV432/pta-block/refs/heads/master/domains/'
					)
				);
			const dest_addr = initialValues.dest_addr
				?.split(' ')
				.filter(
					(addr) =>
						!addr.startsWith(
							'https://raw.githubusercontent.com/LoV432/pta-block/refs/heads/master/domains/'
						)
				)
				.join(' ')
				.trim();
			form.reset({
				...initialValues,
				predefinedDstAddr: predefinedDstAddr || [],
				dest_addr: dest_addr || undefined
			});
		}
	}, [initialValues]);

	async function onSubmit(values: FormValues) {
		setIsLoading(true);
		try {
			let combinedDstAddr: string | undefined;
			if (values.dest_addr && values.predefinedDstAddr.length > 0) {
				combinedDstAddr = `${values.dest_addr} ${values.predefinedDstAddr.join(' ')}`;
			} else {
				combinedDstAddr =
					values.dest_addr || values.predefinedDstAddr.join(' ');
			}

			const submitValues = {
				...values,
				dest_addr: combinedDstAddr || undefined
			};
			const parsedSubmitValues = addPolicyForm.safeParse(submitValues);
			if (!parsedSubmitValues.success) {
				toast.error('Invalid form values', {
					richColors: true
				});
				return;
			}

			if (!policy) {
				const pbrData = await setPBRPolicy({
					values: parsedSubmitValues.data
				});
				if (!pbrData.success) {
					toast.error(pbrData.error);
					return;
				}
			} else {
				const pbrData = await editPBRPolicy({
					values: parsedSubmitValues.data,
					policy
				});
				if (!pbrData.success) {
					toast.error(pbrData.error);
					return;
				}
			}
			await refetchPolicies();
			toast.success('Rule saved successfully', {
				richColors: true
			});
			form.reset();
			setIsOpen(false);
		} catch (err) {
			toast.error('Something went wrong', {
				richColors: true
			});
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					form.reset();
				}
				setIsOpen(open);
			}}
		>
			<DialogTrigger asChild>
				<Button variant="outline" className="w-full">
					{policy ? <PencilLine /> : 'Add Rule'}
				</Button>
			</DialogTrigger>
			<DialogContent className="flex h-full max-h-[80vh] max-w-3xl flex-col">
				<DialogHeader>
					<DialogTitle>Add Rule</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="h-full space-y-6 overflow-y-auto border-t px-2 pt-4"
						style={{ scrollbarColor: 'transparent transparent' }}
					>
						<div className="flex gap-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem className="flex-1">
										<FormControl>
											<Input placeholder="Name" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="enabled"
								render={({ field }) => (
									<FormItem className="flex-1">
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger className="w-full">
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectGroup>
													<SelectItem value="1">Enabled</SelectItem>
													<SelectItem value="0">Disabled</SelectItem>
												</SelectGroup>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="src_addr"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Textarea
											placeholder="Source Address"
											rows={4}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="src_port"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Input placeholder="Source Port" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="dest_addr"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Textarea
											placeholder="Destination Address"
											rows={4}
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="predefinedDstAddr"
							render={({ field }) => (
								<FormItem>
									<PredefinedDstAddr
										predefinedDstAddr={field.value}
										setpredefinedDstAddr={(arr) => field.onChange(arr)}
									/>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="dest_port"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<Input placeholder="Destination Port" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="chain"
							render={({ field }) => (
								<FormItem>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value || 'prerouting'}
									>
										<FormControl>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectGroup>
												<SelectItem value="prerouting">Prerouting</SelectItem>
												<SelectItem value="forward">Forward</SelectItem>
												<SelectItem value="input">Input</SelectItem>
												<SelectItem value="output">Output</SelectItem>
												<SelectItem value="postrouting">Postrouting</SelectItem>
											</SelectGroup>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex gap-4">
							<FormField
								control={form.control}
								name="interface"
								render={({ field }) => (
									<FormItem className="flex-1">
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value}
										>
											<FormControl>
												<SelectTrigger className="w-full">
													<SelectValue
														placeholder={
															interfaces ? undefined : 'Loading interfaces...'
														}
													/>
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectGroup>
													{interfaces?.map((iface) => (
														<SelectItem key={iface} value={iface}>
															{iface}
														</SelectItem>
													))}
												</SelectGroup>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="proto"
								render={({ field }) => (
									<FormItem className="flex-1">
										<Select
											onValueChange={field.onChange}
											defaultValue={field.value || supportedProtocols[0]}
										>
											<FormControl>
												<SelectTrigger className="w-full">
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectGroup>
													{supportedProtocols.map((protocol) => (
														<SelectItem key={protocol} value={protocol}>
															{protocol}
														</SelectItem>
													))}
												</SelectGroup>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? 'Loading...' : 'Save Rule'}
						</Button>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

function PredefinedDstAddr({
	predefinedDstAddr,
	setpredefinedDstAddr
}: {
	predefinedDstAddr: string[];
	setpredefinedDstAddr: React.Dispatch<React.SetStateAction<string[]>>;
}) {
	const allIcons = [
		'facebook',
		'whatsapp',
		'telegram',
		'cloudflare',
		'docker',
		'github',
		'instagram',
		'reddit',
		'signal',
		'snapchat',
		'tiktok',
		'twitter',
		'youtube'
	];
	const LINK =
		'https://raw.githubusercontent.com/LoV432/pta-block/refs/heads/master/domains/';
	return (
		<Accordion type="single" collapsible className="rounded-lg border px-3">
			<AccordionItem value="item-1">
				<AccordionTrigger>Predefined Destination Address</AccordionTrigger>
				<AccordionContent>
					<div className="flex w-full flex-wrap gap-4">
						{allIcons.map((iconName) => (
							<div
								key={iconName}
								className={`h-10 w-10 text-sm ${
									predefinedDstAddr.includes(LINK + iconName)
										? 'fill-white'
										: 'fill-zinc-700'
								}`}
								onClick={() => {
									if (predefinedDstAddr.includes(LINK + iconName)) {
										setpredefinedDstAddr(
											predefinedDstAddr.filter(
												(addr) => addr !== LINK + iconName
											)
										);
									} else {
										setpredefinedDstAddr([
											...predefinedDstAddr,
											LINK + iconName
										]);
									}
								}}
							>
								<PBRIcon iconName={iconName} />
							</div>
						))}
					</div>
				</AccordionContent>
			</AccordionItem>
		</Accordion>
	);
}

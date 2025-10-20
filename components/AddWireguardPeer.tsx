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
	FormLabel,
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
import { toast } from 'sonner';
import {
	wireguardPeerConfigClientSchema,
	wireguardPeerConfigSchema
} from '@/types/ubusCalls';
import {
	addWireguardPeerAction,
	editWireguardPeerAction,
	generateWireguardKeyPair,
	generateWireguardPsk
} from '@/lib/server/wireguardActions';
import { PencilLine, Key, Eye, EyeOff } from 'lucide-react';

type FormValues = z.infer<typeof wireguardPeerConfigClientSchema>;

export function AddEditWireguardPeer({
	refetchWireguardInterfaces,
	wireguardInterface,
	peer,
	initialValues
}: {
	refetchWireguardInterfaces: () => Promise<any>;
	wireguardInterface?: string;
	peer?: string;
	initialValues?: z.infer<typeof wireguardPeerConfigSchema>;
}) {
	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
	const [showPrivateKey, setShowPrivateKey] = useState(false);
	const [showPresharedKey, setShowPresharedKey] = useState(false);

	const form = useForm<FormValues>({
		resolver: zodResolver(wireguardPeerConfigClientSchema),
		defaultValues: {
			allowed_ips: [],
			persistent_keepalive: '',
			disabled: '',
			route_allowed_ips: '',
			endpoint_port: '',
			endpoint_host: '',
			description: '',
			preshared_key: '',
			private_key: '',
			public_key: '',
			...initialValues
		}
	});

	useEffect(() => {
		if (isOpen) {
			form.reset({
				allowed_ips: [],
				persistent_keepalive: '',
				disabled: '',
				route_allowed_ips: '',
				endpoint_port: '',
				endpoint_host: '',
				description: '',
				preshared_key: '',
				private_key: '',
				public_key: '',
				...initialValues
			});
		}
	}, [isOpen]);

	async function handleGenerateKeyPair() {
		setIsGeneratingKeys(true);
		try {
			const result = await generateWireguardKeyPair();
			if (!result.success) {
				toast.error(result.error, { richColors: true });
				return;
			}

			const keys = result.data;
			form.setValue('private_key', keys.private_key);
			form.setValue('public_key', keys.public_key);
			toast.success('Key pair generated successfully', { richColors: true });
		} catch (error) {
			toast.error('Failed to generate key pair', { richColors: true });
			console.error(error);
		} finally {
			setIsGeneratingKeys(false);
		}
	}

	async function handleGeneratePsk() {
		setIsGeneratingKeys(true);
		try {
			const result = await generateWireguardPsk();
			if (!result.success) {
				toast.error(result.error, { richColors: true });
				return;
			}

			const psk = result.data;
			form.setValue('preshared_key', psk);
			toast.success('PSK generated successfully', { richColors: true });
		} catch (error) {
			toast.error('Failed to generate PSK', { richColors: true });
			console.error(error);
		} finally {
			setIsGeneratingKeys(false);
		}
	}

	async function onSubmit(values: FormValues) {
		setIsLoading(true);
		try {
			if (!wireguardInterface) {
				toast.error('WireGuard interface is required', {
					richColors: true
				});
				return;
			}

			let wireguardData;
			if (peer) {
				wireguardData = await editWireguardPeerAction({
					values,
					sectionName: peer
				});
				if (!wireguardData.success) {
					toast.error(wireguardData.error, { richColors: true });
					return;
				}
				toast.success('WireGuard peer updated successfully', {
					richColors: true
				});
			} else {
				wireguardData = await addWireguardPeerAction({
					values,
					interfaceName: wireguardInterface
				});
				if (!wireguardData.success) {
					toast.error(wireguardData.error, { richColors: true });
					return;
				}
				toast.success('WireGuard peer added successfully', {
					richColors: true
				});
			}

			await refetchWireguardInterfaces();
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
				<Button variant="outline" size={peer ? 'sm' : 'default'}>
					{peer ? <PencilLine className="h-3 w-3" /> : 'Add Peer'}
				</Button>
			</DialogTrigger>
			<DialogContent className="flex h-full max-h-[80vh] w-[90vw] max-w-3xl flex-col">
				<DialogHeader>
					<DialogTitle>{peer ? 'Edit Peer' : 'Add WireGuard Peer'}</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="h-full space-y-5 overflow-y-auto border-t px-2 pt-4"
						style={{ scrollbarColor: 'transparent transparent' }}
					>
						<FormField
							control={form.control}
							name="public_key"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Public Key</FormLabel>
									<FormControl>
										<Input placeholder="Public Key" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="private_key"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Private Key</FormLabel>
									<FormControl>
										<div className="relative">
											<Input
												placeholder="Private Key (optional)"
												type={showPrivateKey ? 'text' : 'password'}
												{...field}
												className="pr-10"
											/>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
												onClick={() => setShowPrivateKey(!showPrivateKey)}
											>
												{showPrivateKey ? (
													<EyeOff className="h-4 w-4" />
												) : (
													<Eye className="h-4 w-4" />
												)}
											</Button>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="preshared_key"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Preshared Key</FormLabel>
									<FormControl>
										<div className="relative">
											<Input
												placeholder="Preshared Key (optional)"
												type={showPresharedKey ? 'text' : 'password'}
												{...field}
												className="pr-10"
											/>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
												onClick={() => setShowPresharedKey(!showPresharedKey)}
											>
												{showPresharedKey ? (
													<EyeOff className="h-4 w-4" />
												) : (
													<Eye className="h-4 w-4" />
												)}
											</Button>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex flex-wrap gap-4">
							<Button
								type="button"
								variant="outline"
								onClick={handleGenerateKeyPair}
								disabled={isGeneratingKeys}
								className="flex-1"
							>
								<Key className="mr-2 h-4 w-4" />
								{isGeneratingKeys ? 'Generating...' : 'Generate Key Pair'}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={handleGeneratePsk}
								disabled={isGeneratingKeys}
								className="flex-1"
							>
								<Key className="mr-2 h-4 w-4" />
								{isGeneratingKeys ? 'Generating...' : 'Generate PSK'}
							</Button>
						</div>

						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Input placeholder="Description (optional)" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex gap-4">
							<FormField
								control={form.control}
								name="endpoint_host"
								render={({ field }) => (
									<FormItem className="flex-1">
										<FormLabel>Endpoint Host</FormLabel>
										<FormControl>
											<Input
												placeholder="Endpoint Host (optional)"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="endpoint_port"
								render={({ field }) => (
									<FormItem className="flex-1">
										<FormLabel>Endpoint Port</FormLabel>
										<FormControl>
											<Input
												placeholder="Endpoint Port (optional)"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="allowed_ips"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Allowed IPs</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Allowed IPs (one per line, optional)"
											rows={4}
											value={field.value?.join('\n') || ''}
											onChange={(e) => {
												const ips = e.target.value
													.split('\n')
													.map((ip) => ip.trim());
												field.onChange(ips);
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="persistent_keepalive"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Persistent Keepalive</FormLabel>
									<FormControl>
										<Input
											placeholder="Persistent Keepalive (optional, e.g., 25)"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="route_allowed_ips"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Route Allowed IPs</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Route Allowed IPs" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectGroup>
												<SelectItem value="1">Yes</SelectItem>
												<SelectItem value="0">No</SelectItem>
											</SelectGroup>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="disabled"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Status</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}
									>
										<FormControl>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="Status" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectGroup>
												<SelectItem value="0">Enabled</SelectItem>
												<SelectItem value="1">Disabled</SelectItem>
											</SelectGroup>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? 'Loading...' : 'Save Peer'}
						</Button>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

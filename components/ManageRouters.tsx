'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	checkRouterStatusAction,
	deleteRouterAction,
	rebootRouterAction,
	registerRouterAction,
	updateRouterAction
} from '@/lib/server/routersActions';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Routers } from '@/lib/server/router';
import {
	PencilIcon,
	RefreshCcwIcon,
	RouterIcon,
	SettingsIcon,
	TrashIcon
} from 'lucide-react';
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';

export function ManageRouters() {
	const getRoutersQuery = useQuery({
		queryKey: ['getRouters'],
		queryFn: async () => {
			try {
				const routers = await fetch('/api/routers/all').then(
					(res) => res.json() as Promise<Routers>
				);
				if (!routers.success) {
					throw new Error(routers.error);
				}
				return routers.data;
			} catch (error) {
				throw new Error('Something went wrong while getting routers');
			}
		}
	});

	return (
		<Dialog>
			<DialogTrigger asChild>
				<div>
					<Button variant="outline" className="hidden md:flex">
						<SettingsIcon className="h-4 w-4" />
						Manage Routers
					</Button>
					<button className="flex w-full items-center justify-start gap-2 rounded-none p-2 md:hidden">
						<SettingsIcon className="h-4 w-4" />
						Manage Routers
					</button>
				</div>
			</DialogTrigger>
			<DialogContent className="w-full sm:w-fit">
				<DialogHeader>
					<DialogTitle>Manager Routers</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					<div className="grid gap-4">
						{getRoutersQuery.data &&
							getRoutersQuery.data.map((router) => (
								<div
									key={router.displayName}
									className="bg-card flex flex-wrap items-center gap-2 rounded-md border px-3 py-2"
								>
									<div className="flex items-center gap-2">
										<div className="bg-muted rounded-md p-2">
											<RouterIcon className="text-muted-foreground h-5 w-5" />
										</div>
										{router.displayName}{' '}
										{router.isPrimary ? (
											<span className="text-zinc-500">Primary</span>
										) : (
											''
										)}
									</div>
									<div className="ml-auto flex gap-2 pl-12">
										<EditRouter
											routerToUpdate={router.displayName}
											wasPrimary={router.isPrimary}
										/>
										<DeleteRouter routerToDelete={router.displayName} />
										<RebootRouter routerToReboot={router.displayName} />
									</div>
								</div>
							))}
					</div>
				</div>
				<AddRouter />
			</DialogContent>
		</Dialog>
	);
}

function DeleteRouter({ routerToDelete }: { routerToDelete: string }) {
	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const queryClient = useQueryClient();
	const router = useRouter();

	async function deleteRouter() {
		setIsLoading(true);
		try {
			const deleteRouterRequest = await deleteRouterAction(routerToDelete);
			if (!deleteRouterRequest.success) {
				toast.error(deleteRouterRequest.error, {
					richColors: true,
					duration: 3000
				});
				return;
			}
			await queryClient.invalidateQueries();
			router.refresh();
			toast.success('Router deleted successfully', {
				richColors: true,
				duration: 3000
			});
			if (deleteRouterRequest.redirect) {
				router.push('/register');
			}
		} catch (error) {
			toast.error('Failed to delete router, please try again', {
				richColors: true,
				duration: 3000
			});
			return;
		} finally {
			setIsLoading(false);
		}
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
					<TrashIcon className="h-4 w-4" />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete - {routerToDelete}</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to delete {routerToDelete}?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							disabled={isLoading}
							onClick={(event) => {
								event.preventDefault();
								deleteRouter();
							}}
							variant="destructive"
							className="text-white"
						>
							{isLoading ? 'Deleting...' : 'Delete'}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function RebootRouter({ routerToReboot }: { routerToReboot: string }) {
	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const tanstackQueryClient = useQueryClient();
	const router = useRouter();

	async function rebootRouter() {
		if (isLoading) {
			return;
		}
		setIsLoading(true);
		try {
			const response = await rebootRouterAction(routerToReboot);
			if (!response.success) {
				toast.error('Failed to reboot router, please try again', {
					richColors: true,
					duration: 3000
				});
				return;
			}
			toast.success('Reboot In Progress! Please wait...', {
				richColors: true,
				duration: 3000
			});
			let routerStatus = false;
			let tries = 0;
			while (!routerStatus && tries < 10) {
				const status = await checkRouterStatusAction(routerToReboot);
				if (status.success) {
					routerStatus = true;
					toast.success('Router rebooted successfully', {
						richColors: true,
						duration: 3000
					});
					continue;
				}
				tries++;
				if (tries === 10) {
					toast.error(
						'Router reboot was initiated, but it never came back online. Please manually check your router',
						{
							richColors: true,
							duration: 3000
						}
					);
					continue;
				}
				await new Promise((resolve) => setTimeout(resolve, 3000));
			}
			setIsOpen(false);
		} finally {
			await tanstackQueryClient.invalidateQueries();
			router.refresh();
			setIsLoading(false);
		}
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
					<RefreshCcwIcon className="h-4 w-4" />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Reboot - {routerToReboot}</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to reboot {routerToReboot}?
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							disabled={isLoading}
							onClick={(event) => {
								event.preventDefault();
								rebootRouter();
							}}
							variant="destructive"
							className="text-white"
						>
							{isLoading ? 'Rebooting...' : 'Reboot'}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function EditRouter({
	routerToUpdate,
	wasPrimary
}: {
	routerToUpdate: string;
	wasPrimary: number;
}) {
	const [displayName, setDisplayName] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [isPrimary, setIsPrimary] = useState(wasPrimary === 1 ? true : false);
	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const router = useRouter();
	const queryClient = useQueryClient();

	useEffect(() => {
		if (isOpen) {
			setUsername('');
			setPassword('');
			setIsPrimary(wasPrimary === 1 ? true : false);
		}
	}, [isOpen]);

	async function register() {
		setIsLoading(true);
		try {
			const addRouterRequest = await updateRouterAction({
				routerToUpdate,
				displayName,
				username,
				password,
				isPrimary
			});
			if (!addRouterRequest.success) {
				toast.error(addRouterRequest.error, {
					richColors: true,
					duration: 3000
				});
				return;
			}
			await queryClient.invalidateQueries({ queryKey: ['getRouters'] });
			await queryClient.invalidateQueries();
			router.refresh();
			toast.success('Router updated successfully', {
				richColors: true,
				duration: 3000
			});
			setIsOpen(false);
		} catch (error) {
			toast.error('Failed to register router, please try again', {
				richColors: true,
				duration: 3000
			});
			return;
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen} key={routerToUpdate}>
			<DialogTrigger asChild>
				<Button variant="outline">
					<PencilIcon className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Edit Router {routerToUpdate}</DialogTitle>
				</DialogHeader>
				<div>
					<form
						className="flex flex-col gap-4"
						onSubmit={(e) => {
							e.preventDefault();
							register();
						}}
					>
						<div className="grid gap-4">
							<Input
								placeholder="Display Name (empty if unchanged)"
								value={displayName}
								onChange={(e) => setDisplayName(e.target.value)}
							/>
							<Input
								placeholder="Username (empty if unchanged)"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
							/>
							<Input
								placeholder="Password (empty if unchanged)"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								type="password"
							/>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="primary"
									checked={isPrimary}
									onCheckedChange={(checked) =>
										setIsPrimary(checked as boolean)
									}
								/>
								<label
									htmlFor="primary"
									className="select-none text-sm font-medium"
								>
									Set as primary router
								</label>
							</div>
						</div>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? 'Updating...' : 'Update'}
						</Button>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function AddRouter() {
	const [displayName, setDisplayName] = useState('');
	const [protocol, setProtocol] = useState('http://');
	const [routerIP, setRouterIP] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [isPrimary, setIsPrimary] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const router = useRouter();
	const queryClient = useQueryClient();

	useEffect(() => {
		if (isOpen) {
			setDisplayName('');
			setRouterIP('');
			setUsername('');
			setPassword('');
			setIsPrimary(false);
		}
	}, [isOpen]);

	async function register() {
		setIsLoading(true);
		try {
			const addRouterRequest = await registerRouterAction(
				displayName,
				protocol + routerIP,
				username,
				password,
				isPrimary
			);
			if (!addRouterRequest.success) {
				toast.error(addRouterRequest.error, {
					richColors: true,
					duration: 3000
				});
				return;
			}
			await queryClient.invalidateQueries();
			router.refresh();
			toast.success('Router added successfully', {
				richColors: true,
				duration: 3000
			});
			setIsOpen(false);
		} catch (error) {
			toast.error('Failed to register router, please try again', {
				richColors: true,
				duration: 3000
			});
			return;
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="outline">Add Router</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Add Router</DialogTitle>
				</DialogHeader>
				<div>
					<form
						className="flex flex-col gap-4"
						onSubmit={(e) => {
							e.preventDefault();
							register();
						}}
					>
						<div className="grid gap-4">
							<Input
								placeholder="Display Name"
								required
								value={displayName}
								onChange={(e) => setDisplayName(e.target.value)}
							/>
							<div className="flex items-center justify-center gap-2">
								<Select
									value={protocol}
									defaultValue="http://"
									onValueChange={(value) => setProtocol(value)}
								>
									<SelectTrigger className="min-h-11 min-w-[95px]">
										<SelectValue placeholder="http://" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="http://">HTTP</SelectItem>
										<SelectItem value="https://">HTTPS</SelectItem>
									</SelectContent>
								</Select>
								<p className="text-neutral-300">://</p>
								<Input
									className="h-11 border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500 focus:border-slate-600 focus:ring-slate-600"
									placeholder="192.168.1.1"
									required
									value={routerIP}
									onChange={(e) => setRouterIP(e.target.value)}
								/>
							</div>
							<Input
								placeholder="Username"
								required
								value={username}
								onChange={(e) => setUsername(e.target.value)}
							/>
							<Input
								placeholder="Password"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								type="password"
							/>
							<div className="flex items-center space-x-2">
								<Checkbox
									id="primary"
									checked={isPrimary}
									onCheckedChange={(checked) =>
										setIsPrimary(checked as boolean)
									}
								/>
								<label
									htmlFor="primary"
									className="select-none text-sm font-medium"
								>
									Set as primary router
								</label>
							</div>
						</div>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? 'Registering...' : 'Register'}
						</Button>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}

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
import { Routers } from '@/lib/server/routersActions';
import {
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

export function ManageRouters() {
	const [isLoading, setIsLoading] = useState(false);
	const router = useRouter();
	const queryClient = useQueryClient();
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

	async function deleteRouter(routerToDelete: string) {
		// TODO: Add confirmation dialog
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

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="outline">
					<SettingsIcon className="h-4 w-4" />
					Manage Routers
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Manager Routers</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					<div className="grid gap-4">
						{getRoutersQuery.data &&
							getRoutersQuery.data.map((router) => (
								<div
									key={router.routerIP}
									className="bg-card flex items-center gap-2 rounded-md border px-3 py-2"
								>
									<div className="flex-shrink-0">
										<div className="bg-muted rounded-md p-2">
											<RouterIcon className="text-muted-foreground h-5 w-5" />
										</div>
									</div>
									{router.routerIP}{' '}
									{router.isPrimary ? (
										<span className="text-zinc-500">Primary</span>
									) : (
										''
									)}
									<div className="ml-auto flex gap-2">
										<EditRouter
											routerToUpdate={router.routerIP}
											wasPrimary={router.isPrimary}
										/>
										<Button
											variant="destructive"
											disabled={isLoading}
											size="icon"
											onClick={() => deleteRouter(router.routerIP)}
										>
											<TrashIcon className="h-4 w-4" />
										</Button>
										<RebootRouter routerToReboot={router.routerIP} />
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
	const [routerIP, setRouterIP] = useState('');
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
				routerIP,
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
		<Dialog open={isOpen} onOpenChange={setIsOpen} key={routerToUpdate}>
			<DialogTrigger asChild>
				<Button variant="outline">Edit</Button>
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
								placeholder="Router IP (empty if unchanged)"
								value={routerIP}
								onChange={(e) => setRouterIP(e.target.value)}
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
				routerIP,
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
								placeholder="Router IP"
								required
								value={routerIP}
								onChange={(e) => setRouterIP(e.target.value)}
							/>
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

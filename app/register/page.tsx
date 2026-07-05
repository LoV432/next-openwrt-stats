'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { registerRouterAction } from '@/lib/server/routersActions';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select';
import Image from 'next/image';

export default function Register() {
	const [warningAccepted, setWarningAccepted] = useState('false');
	const [displayName, setDisplayName] = useState('');
	const [protocol, setProtocol] = useState('http://');
	const [routerIP, setRouterIP] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [privateKey, setPrivateKey] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const queryClient = useQueryClient();
	const router = useRouter();

	async function register() {
		setIsLoading(true);
		try {
			const addRouterRequest = await registerRouterAction(
				displayName,
				protocol + routerIP,
				username,
				password,
				true,
				privateKey
			);
			if (!addRouterRequest.success) {
				toast.error(addRouterRequest.errorMessage, {
					richColors: true,
					duration: 3000
				});
				return;
			}
			toast.success('Primary router added. Redirecting to dashboard', {
				richColors: true,
				duration: 3000
			});
			await queryClient.invalidateQueries();
			router.push('/');
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

	useEffect(() => {
		localStorage.removeItem('activeRouter');
		localStorage.removeItem('activeDevice');
	}, []);

	return (
		<div className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
			<div className="w-full max-w-md">
				<div className="mb-8 text-center">
					<h1 className="mb-2 text-3xl font-bold">Welcome to OpenWrt Stats</h1>
					<p className="text-lg text-neutral-400">
						Please register your primary router to get started
					</p>
				</div>

				{warningAccepted === 'true' ? (
					<div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6">
						<form
							className="space-y-4"
							onSubmit={(e) => {
								e.preventDefault();
								register();
							}}
						>
							<div>
								<label className="mb-2 block text-sm font-medium text-neutral-300">
									Display Name
								</label>
								<Input
									className="h-11 border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500 focus:border-slate-600 focus:ring-slate-600"
									placeholder="e.g. Router 1, Main Router, Upstairs AP"
									required
									value={displayName}
									onChange={(e) => setDisplayName(e.target.value)}
								/>
							</div>
							<div>
								<label className="mb-2 block text-sm font-medium text-neutral-300">
									Router IP Address / Domain
								</label>
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
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-neutral-300">
									Username
								</label>
								<Input
									className="h-11 border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500 focus:border-slate-600 focus:ring-slate-600"
									placeholder="root"
									required
									value={username}
									onChange={(e) => setUsername(e.target.value)}
								/>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-neutral-300">
									Password
								</label>
								<Input
									className="h-11 border-neutral-700 bg-neutral-800 text-white placeholder:text-neutral-500 focus:border-slate-600 focus:ring-slate-600"
									placeholder="Enter your router password"
									required
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									type="password"
								/>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-neutral-300">
									SSH Private Key{' '}
									<span className="text-neutral-500">
										(optional — used for the Device Monitor)
									</span>
								</label>
								<Textarea
									className="max-h-40 min-h-20 border-neutral-700 bg-neutral-800 font-mono text-xs text-white placeholder:text-neutral-500 focus:border-slate-600 focus:ring-slate-600"
									placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
									value={privateKey}
									onChange={(e) => setPrivateKey(e.target.value)}
								/>
							</div>

							<Button
								className="mt-6 h-11 w-full font-medium"
								variant={'outline'}
								disabled={isLoading}
							>
								{isLoading ? 'Registering...' : 'Register Router'}
							</Button>
						</form>
					</div>
				) : warningAccepted === 'false' ? (
					<>
						<div className="rounded-lg border border-red-800 bg-red-950 p-4">
							<div className="text-center">
								<h2 className="mb-2 text-lg font-bold text-red-400">
									⚠️ Security Warning
								</h2>
								<p className="text-sm leading-relaxed text-red-300">
									This panel can make destructive changes to your router and
									comes with no built-in authentication. You must put this panel
									behind proper authentication and take backups of your router
									before use.
								</p>
							</div>
						</div>

						<div className="flex justify-center gap-4">
							<Button
								className="mt-6 h-11 w-1/3 font-medium"
								onClick={() => setWarningAccepted('cancel')}
								variant={'outline'}
							>
								Nah, I'm out
							</Button>
							<Button
								className="bg-red-800! mt-6 h-11 w-1/3 font-medium"
								variant={'destructive'}
								onClick={() => setWarningAccepted('true')}
							>
								I understand
							</Button>
						</div>
					</>
				) : (
					<Image
						src="/cancel.jpg"
						alt="cancel"
						width={400}
						height={200}
						loading="eager"
						className="w-full"
					/>
				)}
			</div>
		</div>
	);
}

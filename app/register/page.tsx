'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registerRouterAction } from '@/lib/server/routersActions';
import { useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

export default function Register() {
	const [routerIP, setRouterIP] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const queryClient = useQueryClient();
	const router = useRouter();

	async function register() {
		setIsLoading(true);
		try {
			const addRouterRequest = await registerRouterAction(
				routerIP,
				username,
				password,
				true
			);
			if (!addRouterRequest.success) {
				toast.error(addRouterRequest.error, {
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

	return (
		<div className="mt-20 flex flex-col items-center justify-center">
			<h1 className="text-3xl font-bold">Welcome to Openwrt Stats</h1>
			<p className="text-xl">
				Please register your primary router to get started
			</p>
			<form
				className="w-xs mt-10 flex flex-col items-center justify-center gap-4"
				onSubmit={(e) => {
					e.preventDefault();
					register();
				}}
			>
				<Input
					className="h-11"
					placeholder="Router IP"
					required
					value={routerIP}
					onChange={(e) => setRouterIP(e.target.value)}
				/>
				<Input
					className="h-11"
					placeholder="Username"
					required
					value={username}
					onChange={(e) => setUsername(e.target.value)}
				/>
				<Input
					className="h-11"
					placeholder="Password"
					required
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					type="password"
				/>
				<Button className="h-10 w-full" disabled={isLoading}>
					{isLoading ? 'Registering...' : 'Register'}
				</Button>
			</form>
		</div>
	);
}

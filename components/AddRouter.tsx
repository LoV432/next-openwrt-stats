'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { registerRouter } from '@/lib/server/registerRouter';
import { useState } from 'react';
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

export function AddRouter() {
	const [routerIP, setRouterIP] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [isPrimary, setIsPrimary] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const router = useRouter();

	async function register() {
		setIsLoading(true);
		try {
			const addRouterRequest = await registerRouter(
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
			toast.success('Primary router added. Redirecting to dashboard', {
				richColors: true,
				duration: 3000
			});
			setIsOpen(false);
			router.refresh();
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
								onCheckedChange={(checked) => setIsPrimary(checked as boolean)}
							/>
							<label
								htmlFor="primary"
								className="select-none text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								Set as primary router
							</label>
						</div>
					</div>
					<Button type="submit" disabled={isLoading}>
						{isLoading ? 'Registering...' : 'Register'}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}

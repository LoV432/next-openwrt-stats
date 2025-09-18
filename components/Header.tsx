'use client';

import { ManageRouters } from '@/components/ManageRouters';
import { InterfacePicker } from './InterfacePicker';
import { useNetwork } from '@/providers/networkContext';
import { PBRInfo } from './PBRInfo';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog';
import { Menu, RouterIcon } from 'lucide-react';
import { Button } from './ui/button';

export function Header() {
	const { networkInterfaces, activeDevice, setActiveDevice } = useNetwork();

	return (
		<header className="bg-card sticky top-0 z-10 w-full border-b border-neutral-800">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="rounded-lg bg-neutral-800 p-2">
							<RouterIcon className="h-6 w-6 text-white" />
						</div>
						<h1 className="text-2xl font-bold text-white">OpenWrt Stats</h1>
					</div>

					<div className="hidden items-center gap-4 md:flex">
						{networkInterfaces && networkInterfaces.length > 1 && (
							<InterfacePicker
								networkInterfaces={networkInterfaces}
								activeDevice={activeDevice}
								setActiveDevice={setActiveDevice}
							/>
						)}
						{process.env.NEXT_PUBLIC_PBR_ENABLED === 'true' && <PBRInfo />}
						<ManageRouters />
					</div>

					<div className="flex items-center md:hidden">
						<Dialog>
							<DialogTrigger asChild>
								<Button variant="outline" size="sm" aria-label="Open menu">
									<Menu className="h-4 w-4" />
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-[320px]">
								<DialogHeader>
									<DialogTitle>Menu</DialogTitle>
								</DialogHeader>
								<div className="mt-2 flex flex-col gap-3">
									{networkInterfaces && networkInterfaces.length > 1 && (
										<div>
											<InterfacePicker
												networkInterfaces={networkInterfaces}
												activeDevice={activeDevice}
												setActiveDevice={setActiveDevice}
											/>
										</div>
									)}
									<div>
										{process.env.NEXT_PUBLIC_PBR_ENABLED === 'true' && (
											<PBRInfo />
										)}
									</div>
									<div>
										<ManageRouters />
									</div>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</div>
			</div>
		</header>
	);
}

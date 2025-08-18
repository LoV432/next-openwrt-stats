'use client';

import { AddRouter } from '@/components/AddRouter';
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
import { Menu } from 'lucide-react';
import { Button } from './ui/button';

export function Header() {
	const { networkInterfaces, activeDevice, setActiveDevice } = useNetwork();

	return (
		<header className="w-full">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					<div className="text-xl font-semibold sm:text-2xl">OpenWrt Stats</div>

					<div className="hidden items-center gap-4 md:flex">
						{networkInterfaces && networkInterfaces.length > 1 && (
							<InterfacePicker
								networkInterfaces={networkInterfaces}
								activeDevice={activeDevice}
								setActiveDevice={setActiveDevice}
							/>
						)}
						<PBRInfo />
						<AddRouter />
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
										<PBRInfo />
									</div>
									<div>
										<AddRouter />
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

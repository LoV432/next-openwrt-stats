'use client';
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover';
import { RouterIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';

export function RouterPicker({
	allRouters,
	activeDevice,
	setActiveDevice
}: {
	allRouters: { routerIP: string; isPrimary: number }[];
	activeDevice: string | undefined;
	setActiveDevice: (device: string) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);
	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<button className="border-1 flex w-fit items-center justify-center gap-1.5 rounded-md border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-white hover:bg-neutral-700">
					<RouterIcon className="inline-block h-4 w-4" />
					<span className="text-muted-foreground text-sm">
						{activeDevice || 'Select Router'}
					</span>
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-0" align="end">
				<div className="grid">
					<h4 className="mb-2 border-b px-4 py-3 font-medium">
						Network Interfaces
					</h4>
					<div className="p-2">
						{allRouters.map((router) => (
							<button
								onClick={() => {
									setActiveDevice(router.routerIP);
									setIsOpen(false);
								}}
								key={router.routerIP}
								className="hover:bg-muted flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm"
							>
								<span className="text-muted-foreground">{router.routerIP}</span>
							</button>
						))}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

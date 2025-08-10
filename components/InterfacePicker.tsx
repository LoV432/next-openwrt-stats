'use client';
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover';
import { NetworkInterface } from '@/types/ubusCalls';
import { GlobeIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';

export function InterfacePicker({
	networkInterfaces,
	activeDevice,
	setActiveDevice
}: {
	networkInterfaces: Array<NetworkInterface>;
	activeDevice: NetworkInterface | undefined;
	setActiveDevice: (device: NetworkInterface) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);
	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline">
					<GlobeIcon className="h-4 w-4" />
					<span>
						{activeDevice?.device ||
							activeDevice?.l3_device ||
							'Select Interface'}
					</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-0" align="end">
				<div className="grid">
					<h4 className="mb-2 border-b px-4 py-3 font-medium">
						Network Interfaces
					</h4>
					<div className="p-2">
						{networkInterfaces.map((networkInterface) => (
							<button
								onClick={() => {
									setActiveDevice(networkInterface);
									setIsOpen(false);
								}}
								key={networkInterface.interface}
								className="hover:bg-muted flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm"
							>
								<span className="text-muted-foreground">
									{networkInterface.interface}
								</span>
								<span className="font-medium">
									{networkInterface.device || networkInterface.l3_device}
								</span>
							</button>
						))}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

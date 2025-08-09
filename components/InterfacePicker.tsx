'use client';
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover';
import { GlobeIcon } from 'lucide-react';
import { useState } from 'react';

export function InterfacePicker({
	networkInterfaces,
	activeDevice,
	setActiveDevice
}: {
	networkInterfaces: Array<{
		interface: string;
		device?: string;
		l3_device: string;
	}>;
	activeDevice?: {
		device?: string;
		l3_device: string;
		interface: string;
	};
	setActiveDevice: (device: {
		device?: string;
		l3_device: string;
		interface: string;
	}) => void;
}) {
	const [isOpen, setIsOpen] = useState(false);
	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger>
				<div className="hover:bg-muted flex w-full cursor-pointer items-center justify-end gap-2 rounded-md p-2">
					<GlobeIcon className="h-4 w-4" />
					<span className="text-muted-foreground text-sm">
						{activeDevice?.device || activeDevice?.l3_device}
					</span>
				</div>
			</PopoverTrigger>
			<PopoverContent className="w-80">
				<div className="space-y-2">
					<h4 className="mb-2 font-medium">Network Interfaces</h4>
					<div className="space-y-1">
						{networkInterfaces.map((networkInterface) => (
							<p
								onClick={() => {
									setActiveDevice(networkInterface);
									setIsOpen(false);
								}}
								key={networkInterface.interface}
								className="hover:bg-muted flex cursor-pointer justify-between rounded p-2 text-sm"
							>
								<span className="text-muted-foreground">
									{networkInterface.interface}
								</span>
								<span>
									{networkInterface.device || networkInterface.l3_device}
								</span>
							</p>
						))}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

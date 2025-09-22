'use client';
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover';
import { GlobeIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { useNetwork } from '@/providers/networkContext';

export function InterfacePicker() {
	const [isOpen, setIsOpen] = useState(false);
	const { networkInterfaces, activeDevice, setActiveDevice } = useNetwork();
	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<div>
					{activeDevice ? (
						<>
							<Button variant="outline" className="hidden md:flex">
								<GlobeIcon className="h-4 w-4" />
								{activeDevice?.interface || 'Network Interfaces'}
							</Button>
							<button className="flex w-full items-center justify-start gap-2 rounded-none border-b-2 p-2 md:hidden">
								<GlobeIcon className="h-4 w-4" />
								{activeDevice?.interface || 'Network Interfaces'}
							</button>
						</>
					) : (
						<></>
					)}
				</div>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-0" align="end">
				<div className="grid">
					<h4 className="mb-2 border-b px-4 py-3 font-medium">
						Network Interfaces
					</h4>
					<div className="p-2">
						{networkInterfaces?.map((networkInterface) => (
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

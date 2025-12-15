'use client';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { SettingsIcon, CloudDownloadIcon, ChevronDownIcon } from 'lucide-react';

type DialogState = {
	isOpen: boolean;
	setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export function SystemDropDown({
	updateManagerDialogState,
	manageRoutersDialogState
}: {
	updateManagerDialogState: DialogState;
	manageRoutersDialogState: DialogState;
}) {
	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" className="gap-1">
						<SettingsIcon />
						<span className="hidden md:block">System</span>
						<ChevronDownIcon className="ml-0.5 mt-1 hidden h-4 w-4 md:block" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					className="w-fit"
					align="end"
					sideOffset={10}
					alignOffset={10}
				>
					<DropdownMenuItem
						className="py-2"
						onClick={() => updateManagerDialogState.setIsOpen(true)}
					>
						<CloudDownloadIcon className="h-4 w-4" />
						Update Manager
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="py-2"
						onClick={() => manageRoutersDialogState.setIsOpen(true)}
					>
						<SettingsIcon className="h-4 w-4" />
						Manage Routers
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}

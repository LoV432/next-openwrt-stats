import { ManageRouters } from '@/components/ManageRouters';
import { InterfacePicker } from './InterfacePicker';
import { PBRInfo } from './PBRInfo';
import { UpdateManagerModal } from './UpdateManager';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
	DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Menu, RouterIcon } from 'lucide-react';
import { Button } from './ui/button';
import { RouterLogs } from './RouterLogs';

export function Header() {
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
						<InterfacePicker />
						{process.env.PBR_ENABLED === 'true' && <PBRInfo />}
						<RouterLogs />
						<UpdateManagerModal />
						<ManageRouters />
					</div>

					<div className="flex items-center md:hidden">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm" aria-label="Open menu">
									<Menu className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								className="pointer-events-none sm:max-w-[320px]"
								align="end"
							>
								<div className="flex flex-col">
									<DropdownMenuLabel className="border-b-2 pb-2 text-base">
										Menu
									</DropdownMenuLabel>
									<InterfacePicker />
									{process.env.PBR_ENABLED === 'true' && <PBRInfo />}
									<RouterLogs />
									<UpdateManagerModal />
									<ManageRouters />
								</div>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</div>
		</header>
	);
}

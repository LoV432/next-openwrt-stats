'use client';

import { AddRouter } from '@/components/AddRouter';
import { InterfacePicker } from './InterfacePicker';
import { useNetwork } from '@/providers/networkContext';
import { PBRInfo } from './PBRInfo';

export function Header() {
	const { networkInterfaces, activeDevice, setActiveDevice } = useNetwork();

	return (
		<header className="w-full">
			<div className="mx-auto flex h-16 items-center justify-between">
				<div className="text-2xl font-semibold">OpenWrt Stats</div>
				<div className="flex items-center gap-4">
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
			</div>
		</header>
	);
}

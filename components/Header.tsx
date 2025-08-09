'use client';

import { AddRouter } from '@/components/AddRouter';

export function Header() {
	return (
		<header className="w-full">
			<div className="mx-auto flex h-16 items-center justify-between">
				<div className="text-2xl font-semibold">OpenWrt Stats</div>
				<div className="flex items-center gap-4">
					<AddRouter />
				</div>
			</div>
		</header>
	);
}

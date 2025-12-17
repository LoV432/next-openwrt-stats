'use client';
import { InterfacePicker } from './InterfacePicker';
import { FileText, RouterIcon } from 'lucide-react';
import { Button } from './ui/button';
import { PluginsDropDown } from './PluginsDropDown';
import { SystemDropDown } from './SystemDropDown';
import { PBRInfo } from './PBRInfo';
import { WireguardInfo } from './WireguardInfo';
import { AllPresenceEventsDialog } from './AllPresenceEvents';
import { useState } from 'react';
import { useNetwork } from '@/providers/networkContext';
import { RouterLogs } from './RouterLogs';
import { UpdateManagerModal } from './UpdateManager';
import { ManageRouters } from './ManageRouters';

export function Header({
	pbrEnabled,
	presenceEnabled
}: {
	pbrEnabled: boolean;
	presenceEnabled: boolean;
}) {
	const pbrDialogState = useState(false);
	const wireguardDialogState = useState(false);
	const logsDialogState = useState(false);
	const updateManagerDialogState = useState(false);
	const managetRouterDialogState = useState(false);
	const presenceDialogState = useState(false);
	const { networkInterfaces } = useNetwork();
	const wireguardInterfaces = networkInterfaces?.filter(
		(device) => device.proto === 'wireguard'
	);
	const [selectedWireguardInterface, setSelectedWireguardInterface] = useState(
		wireguardInterfaces?.[0]?.interface || ''
	);
	const showPluginDropdown =
		(wireguardInterfaces?.length && wireguardInterfaces.length > 0) ||
		pbrEnabled ||
		presenceEnabled;
	return (
		<header className="bg-card sticky top-0 z-10 w-full border-b border-neutral-800">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="rounded-lg bg-neutral-800 p-2">
							<RouterIcon className="h-6 w-6 text-white" />
						</div>
						<h1 className="hidden text-2xl font-bold text-white md:block">
							OpenWrt Stats
						</h1>
					</div>

					<div className="flex items-center gap-2 sm:gap-4">
						<InterfacePicker />
						<Button onClick={() => logsDialogState[1](true)} variant="outline">
							<FileText className="h-4 w-4" />
							<span className="hidden md:block">Router Logs</span>
						</Button>
						{showPluginDropdown && (
							<PluginsDropDown
								pbrDialogState={{
									isOpen: pbrDialogState[0],
									setIsOpen: pbrDialogState[1]
								}}
								wireguardDialogState={{
									isOpen: wireguardDialogState[0],
									setIsOpen: wireguardDialogState[1]
								}}
								presenceDialogState={{
									isOpen: presenceDialogState[0],
									setIsOpen: presenceDialogState[1]
								}}
								wireguardInterfaces={wireguardInterfaces || []}
								setSelectedWireguardInterface={setSelectedWireguardInterface}
								pbrEnabled={pbrEnabled}
								presenceEnabled={presenceEnabled}
							/>
						)}
						<SystemDropDown
							updateManagerDialogState={{
								isOpen: updateManagerDialogState[0],
								setIsOpen: updateManagerDialogState[1]
							}}
							manageRoutersDialogState={{
								isOpen: managetRouterDialogState[0],
								setIsOpen: managetRouterDialogState[1]
							}}
						/>
					</div>
				</div>
			</div>
			{pbrEnabled && (
				<PBRInfo
					pbrDialogState={{
						isOpen: pbrDialogState[0],
						setIsOpen: pbrDialogState[1]
					}}
				/>
			)}
			{wireguardInterfaces?.length && wireguardInterfaces.length > 0 && (
				<WireguardInfo
					wireguardDialogState={{
						isOpen: wireguardDialogState[0],
						setIsOpen: wireguardDialogState[1]
					}}
					interfaceName={selectedWireguardInterface}
					showButton={false}
				/>
			)}
			{presenceEnabled && (
				<AllPresenceEventsDialog
					dialogState={{
						isOpen: presenceDialogState[0],
						setIsOpen: presenceDialogState[1]
					}}
				/>
			)}
			<RouterLogs
				dialogState={{
					isOpen: logsDialogState[0],
					setIsOpen: logsDialogState[1]
				}}
			/>
			<UpdateManagerModal
				dialogState={{
					isOpen: updateManagerDialogState[0],
					setIsOpen: updateManagerDialogState[1]
				}}
			/>
			<ManageRouters
				dialogState={{
					isOpen: managetRouterDialogState[0],
					setIsOpen: managetRouterDialogState[1]
				}}
			/>
		</header>
	);
}

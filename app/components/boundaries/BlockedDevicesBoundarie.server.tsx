import { getAllBlockedDevices } from '@/lib/block-user-script.server';
import BlockedDevicesWrapper from './BlockedDevicesBoundarie.client';

export default async function BlockedDevicesBoundarie({
	children
}: {
	children: React.ReactNode;
}) {
	const blockedDevices = await getAllBlockedDevices();
	if ('error' in blockedDevices)
		return (
			<BlockedDevicesWrapper blockedDevices={[]}>
				{children}
			</BlockedDevicesWrapper>
		);
	return (
		<BlockedDevicesWrapper blockedDevices={blockedDevices}>
			{children}
		</BlockedDevicesWrapper>
	);
}

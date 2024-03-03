import { getConnectedDevices } from '@/lib/get-connected-devices';
import ConnectedDevicesWrapper from './ConnectedDevicesBoundarie.client';

export default async function ConnectedDevicesBoundarie({
	children
}: {
	children: React.ReactNode;
}) {
	const connectedDevices = await getConnectedDevices();
	if ('error' in connectedDevices)
		return (
			<ConnectedDevicesWrapper connectedDevices={[]}>
				{children}
			</ConnectedDevicesWrapper>
		);
	return (
		<ConnectedDevicesWrapper connectedDevices={connectedDevices}>
			{children}
		</ConnectedDevicesWrapper>
	);
}

'use client';
import { useSetAtom, atom } from 'jotai';
import { useEffect, useMemo } from 'react';
import { getConnectedDevices } from '@/lib/get-connected-devices';
export const allConnectedDevices = atom<Array<string>>([]);

export default function ConnectedDevicesWrapper({
	children,
	connectedDevices: connectedDevices
}: {
	children: React.ReactNode;
	connectedDevices: string[];
}) {
	const setConnectedDevices = useSetAtom(allConnectedDevices);
	useMemo(() => {
		setConnectedDevices(connectedDevices);
	}, []);
	useEffect(() => {
		setInterval(() => {
			getConnectedDevices().then((connectedDevices) => {
				if ('error' in connectedDevices) return;
				setConnectedDevices(connectedDevices);
			});
		}, 5000);
	});
	return <>{children}</>;
}

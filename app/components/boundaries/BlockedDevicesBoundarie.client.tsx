'use client';
import { useSetAtom, atom } from 'jotai';
import { useMemo } from 'react';
export const allBlockedDevices = atom<Array<string>>([]);

export default function BlockedDevicesWrapper({
	children,
	blockedDevices
}: {
	children: React.ReactNode;
	blockedDevices: string[];
}) {
	const setBlockedDevices = useSetAtom(allBlockedDevices);
	useMemo(() => {
		setBlockedDevices(blockedDevices.filter((device) => device !== ''));
	}, []);
	return <>{children}</>;
}

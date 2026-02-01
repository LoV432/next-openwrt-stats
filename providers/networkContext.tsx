'use client';
import { NetworkInterface } from '@/types/ubusCalls';
import { NetworkInterfaces } from '@/lib/server/routerInterfaces';
import { useQuery } from '@tanstack/react-query';
import {
	createContext,
	useContext,
	useState,
	ReactNode,
	useEffect
} from 'react';
import { usePathname } from 'next/navigation';

type NetworkContextType = {
	networkInterfaces?: NetworkInterface[];
	activeDevice?: NetworkInterface;
	setActiveDevice: (device: NetworkInterface) => void;
	isLoading: boolean;
	error?: Error;
};

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
	const [activeDevice, setActiveDevice] = useState<NetworkInterface>();
	const pathname = usePathname();
	const {
		data: networkInterfaces,
		isLoading,
		error,
		dataUpdatedAt
	} = useQuery({
		queryKey: ['networkInterfaces'],
		queryFn: async () => {
			const networkInterfaces = await fetch(
				'/api/routers/primary/interfaces'
			).then((res) => res.json() as Promise<NetworkInterfaces>);
			if (!networkInterfaces.success) {
				throw new Error(networkInterfaces.errorMessage);
			}
			if (networkInterfaces.data.length === 0) {
				throw new Error('No network interfaces found');
			}
			return networkInterfaces.data;
		},
		refetchInterval: false,
		retry: 1,
		enabled: pathname !== '/register'
	});

	useEffect(() => {
		if (
			(networkInterfaces && !activeDevice) ||
			// This is in case the primary router is switched. This ensures the activeDevice is valid
			networkInterfaces?.findIndex(
				(device) =>
					device.device === activeDevice?.device &&
					device.interface === activeDevice?.interface
			) === -1
		) {
			const localStorageActiveDevice = localStorage.getItem('activeDevice');
			if (localStorageActiveDevice) {
				const localStorageActiveDeviceParsed = JSON.parse(
					localStorageActiveDevice
				);
				const activeDevice = networkInterfaces?.find(
					(device) =>
						device.device === localStorageActiveDeviceParsed.device &&
						device.interface === localStorageActiveDeviceParsed.interface
				);
				if (!activeDevice) {
					const wanDevice = networkInterfaces?.find(
						(device) => device.interface === 'wan'
					);
					setActiveDevice(wanDevice || networkInterfaces[0]);
					return;
				}
				setActiveDevice(activeDevice);
			} else {
				const wanDevice = networkInterfaces?.find(
					(device) => device.interface === 'wan'
				);
				setActiveDevice(wanDevice || networkInterfaces[0]);
			}
		}
	}, [dataUpdatedAt, activeDevice]);

	useEffect(() => {
		if (activeDevice) {
			localStorage.setItem('activeDevice', JSON.stringify(activeDevice));
		}
	}, [activeDevice]);

	return (
		<NetworkContext.Provider
			value={{
				networkInterfaces,
				activeDevice,
				setActiveDevice,
				isLoading,
				error: error as Error | undefined
			}}
		>
			{children}
		</NetworkContext.Provider>
	);
}

export function useNetwork() {
	const context = useContext(NetworkContext);
	if (context === undefined) {
		throw new Error('useNetwork must be used within a NetworkProvider');
	}
	return context;
}

'use client';
import DashboardCardBase from './DashboardBase.server';
import { connectionLogsList } from './Dashboard.server';
import { useEffect, useState } from 'react';
export function DashboardCardCurrentStatus({
	currentStatusPrerender
}: {
	currentStatusPrerender: string;
}) {
	const [isConnected, setIsConnected] = useState(
		returnStatusBool(currentStatusPrerender)
	);
	useEffect(() => {
		const interval = setInterval(() => {
			const getNewStatus = fetch('/api/get-connection-logs?days=-1');
			getNewStatus
				.then((response) => response.json())
				.then((data: connectionLogsList) => {
					if (data[0].status === 'connected') {
						setIsConnected(true);
					} else {
						setIsConnected(false);
					}
				});
		}, 3000);
		return () => clearInterval(interval);
	}, []);
	return (
		<>
			<DashboardCardBase
				backgroundColor={isConnected ? 'bg-emerald-700' : 'bg-red-800'}
			>
				<div className="text-2xl font-bold">
					<h1>Current Status:</h1>
					<h1>{isConnected ? 'Connected' : 'Disconnected'}</h1>
				</div>
			</DashboardCardBase>
		</>
	);
}

function returnStatusBool(status: string) {
	if (!status) {
		return false;
	} else {
		if (status === 'connected') return true;
		if (status === 'disconnected') return false;
	}
	return false;
}

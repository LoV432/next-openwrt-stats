'use client';
import DashboardCardBase from './DashboardBase.server';
import { connectionLogsList } from './Dashboard.server';
import { useEffect, useMemo, useState } from 'react';
export function DashboardCardCurrentStatus({
	allConnectionStatus
}: {
	allConnectionStatus: connectionLogsList;
}) {
	const [isConnected, setIsConnected] = useState(false);
	let lastStatus = allConnectionStatus[0];
	useMemo(() => {
		setIsConnected(returnStatusBool(lastStatus));
	}, []);
	useEffect(() => {
		setIsConnected(returnStatusBool(lastStatus));
	}, [allConnectionStatus]);
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

function returnStatusBool(status: connectionLogsList[0]) {
	if (!status) {
		return false;
	} else {
		if (status.status === 'connected') return true;
		if (status.status === 'disconnected') return false;
	}
	return false;
}

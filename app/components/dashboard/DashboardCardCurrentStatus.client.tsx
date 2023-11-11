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

'use client';
import { connectionLogsList } from './Dashboard.server';
import { useEffect, useState } from 'react';
export function DashboardCardCurrentStatus({
	currentStatusPrerender,
	ip,
	pppoeUptime
}: {
	currentStatusPrerender: string;
	ip: string;
	pppoeUptime: string;
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
			<div
				className={`card w-full justify-center sm:w-96 ${
					isConnected ? 'bg-emerald-700' : 'bg-red-800'
				}`}
			>
				<div className="card-body w-fit flex-grow-0 justify-center gap-5">
					<p className="border-b-2 border-white border-opacity-40 pb-1 text-xl font-semibold">
						Status: {isConnected ? 'Connected' : 'Disconnected'}
					</p>
					{isConnected ? (
						<>
							<p className="border-b-2 border-white border-opacity-40 pb-1 text-lg font-semibold">
								IP: {ip}
							</p>
							<p className="border-b-2 border-white border-opacity-40 pb-1 text-lg font-semibold">
								Uptime: {pppoeUptime}
							</p>
						</>
					) : null}
				</div>
			</div>
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

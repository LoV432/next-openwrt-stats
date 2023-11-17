'use client';
import { connectionLogsList } from '../Dashboard.server';
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
	const [showToast, setShowToast] = useState(false);

	function copyToClipboard() {
		navigator.clipboard.writeText(ip);
		setShowToast(true);
		setTimeout(() => {
			setShowToast(false);
		}, 2000);
	}

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
							<p
								onClick={copyToClipboard}
								className="cursor-pointer border-b-2 border-white border-opacity-40 pb-1 text-lg font-semibold"
							>
								IP: {ip}
							</p>
							<p className="border-b-2 border-white border-opacity-40 pb-1 text-lg font-semibold">
								Uptime: {pppoeUptime}
							</p>
						</>
					) : null}
				</div>
			</div>

			{showToast ? <CopyToast /> : null}
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

function CopyToast() {
	return (
		<div className="toast toast-end toast-top z-50">
			<div className="alert alert-success border-2 border-green-900 text-lg font-semibold">
				<span>IP address copied to clipboard.</span>
			</div>
		</div>
	);
}

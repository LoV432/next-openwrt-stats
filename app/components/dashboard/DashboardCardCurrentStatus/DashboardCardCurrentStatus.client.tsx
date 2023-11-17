'use client';
import { useEffect, useState } from 'react';
import { pppoeStatusReturnType } from '@/lib/get-pppoe-status';
import { formatUpTime } from '@/lib/format-uptime';
export function DashboardCardCurrentStatus({
	pppoeStatusPrerender
}: {
	pppoeStatusPrerender: pppoeStatusReturnType;
}) {
	const [pppoeStatus, setPppoeStatus] = useState(pppoeStatusPrerender);
	const [showToast, setShowToast] = useState(false);

	function copyToClipboard() {
		navigator.clipboard.writeText(pppoeStatus.ip);
		setShowToast(true);
		setTimeout(() => {
			setShowToast(false);
		}, 3000);
	}

	useEffect(() => {
		const interval = setInterval(() => {
			const getNewPppoeStatus = fetch('/api/get-pppoe-status');
			getNewPppoeStatus
				.then((response) => response.json())
				.then((data: pppoeStatusReturnType) => {
					setPppoeStatus(data);
				});
		}, 3000);
		return () => clearInterval(interval);
	}, []);
	return (
		<>
			<div
				className={`card w-full justify-center sm:w-96 ${
					pppoeStatus.up ? 'bg-emerald-700' : 'bg-red-800'
				}`}
			>
				<div className="card-body w-fit flex-grow-0 justify-center gap-5">
					<p className="border-b-2 border-white border-opacity-40 pb-1 text-xl font-semibold">
						Status: {pppoeStatus.up ? 'Connected' : 'Disconnected'}
					</p>
					{pppoeStatus.up ? (
						<>
							<p
								onClick={copyToClipboard}
								className="cursor-pointer border-b-2 border-white border-opacity-40 pb-1 text-lg font-semibold"
							>
								IP: {pppoeStatus.ip}
							</p>
							<p className="border-b-2 border-white border-opacity-40 pb-1 text-lg font-semibold">
								Uptime: {formatUpTime(pppoeStatus.uptime)}
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

'use client';

import { useEffect, useRef, useState } from 'react';
import { allConnectionStatusType } from './Dashboard.server';
import DashboardCardBase from './DashboardBase.server';
import Image from 'next/image';

export default function DashboardCardTotalDisconnectTime({
	allConnectionStatus,
	isWithinTimeFrame
}: {
	allConnectionStatus: allConnectionStatusType;
	isWithinTimeFrame: boolean;
}) {
	const [finalText, setFinalText] = useState('Loading...');
	const [backgroundColor, setBackgroundColor] = useState(
		dashboardColor(allConnectionStatus)
	);
	let connectionLogsListModalRef = useRef<HTMLDialogElement>(null);
	function toggleConnectionLogsListModal() {
		if (connectionLogsListModalRef.current?.open) {
			connectionLogsListModalRef.current.close();
		} else {
			connectionLogsListModalRef.current?.showModal();
		}
	}
	useEffect(() => {
		setFinalText(
			parseAllConnectionStatus(allConnectionStatus, isWithinTimeFrame)
		);
		setBackgroundColor(dashboardColor(allConnectionStatus));
	}, []);
	return (
		<>
			<DashboardCardBase backgroundColor={backgroundColor}>
				<div className="text-xl font-bold">
					{finalText}
					<Image
						onClick={toggleConnectionLogsListModal}
						className="ml-3 inline cursor-pointer"
						src="/expand.svg"
						alt="Open Details"
						width={20}
						height={20}
					/>
				</div>
			</DashboardCardBase>
			<ConnectionLogsListModal
				toggleConnectionLogsListModal={toggleConnectionLogsListModal}
				connectionLogsListModalRef={connectionLogsListModalRef}
			/>
		</>
	);
}

function ConnectionLogsListModal({
	toggleConnectionLogsListModal,
	connectionLogsListModalRef
}: {
	toggleConnectionLogsListModal: () => void;
	connectionLogsListModalRef: React.RefObject<HTMLDialogElement>;
}) {
	const [days, setDays] = useState(1);
	return (
		<dialog ref={connectionLogsListModalRef} className="modal">
			<div className="modal-box bg-zinc-900">
				<h3 className="pb-5 text-lg font-bold">Connection Logs</h3>
				<p className="pb-5">Number of days to show: {days}</p>
				<input
					type="range"
					min="0"
					max="7"
					className="range range-secondary"
					value={days}
					onChange={(e) => setDays(parseInt(e.target.value))}
				/>
				<ConnectionLogsList days={days} />
				<button
					onClick={toggleConnectionLogsListModal}
					className="btn btn-circle btn-ghost btn-sm absolute right-2 top-2"
				>
					✕
				</button>
			</div>
			<div className="modal-backdrop bg-zinc-700 opacity-30">
				<button onClick={toggleConnectionLogsListModal}>close</button>
			</div>
		</dialog>
	);
}

function ConnectionLogsList({ days }: { days: number }) {
	const [connectionLogsListBody, setConnectionLogsListBody] = useState<
		JSX.Element[]
	>([]);
	let listBody: JSX.Element[] = [];

	async function updateLogsList(days: number) {
		const connectionLogsList = (await (
			await fetch(`/api/get-connection-logs?days=${days}`)
		).json()) as allConnectionStatusType;
		connectionLogsList.forEach((status) => {
			listBody.push(
				<tr className="border-slate-300 border-opacity-30" key={status.id}>
					<th>{status.id}</th>
					<td className="font-semibold">
						{status.status === 'connected' ? 'Connected' : 'Disconnected'}
					</td>
					<td className="font-semibold">
						{new Date(status.time).toLocaleString('en-US', {
							day: '2-digit',
							month: 'short',
							hour: 'numeric',
							minute: '2-digit',
							second: '2-digit'
						})}
					</td>
				</tr>
			);
		});
		setConnectionLogsListBody(listBody);
	}
	useEffect(() => {
		updateLogsList(days);
	}, [days]);
	return (
		<div className="overflow-x-auto">
			<table className="table">
				<thead className="text-slate-300 ">
					<tr className="border-slate-300 border-opacity-30">
						<th>ID</th>
						<th>Status</th>
						<th>Time</th>
					</tr>
				</thead>
				<tbody>{connectionLogsListBody}</tbody>
			</table>
		</div>
	);
}

function dashboardColor(allConnectionStatus: allConnectionStatusType) {
	let backgroundColor = 'bg-emerald-700';
	allConnectionStatus.forEach((status) => {
		if (status.status === 'disconnected') {
			backgroundColor = 'bg-red-800';
		}
	});
	return backgroundColor;
}

function parseAllConnectionStatus(
	allConnectionStatus: allConnectionStatusType,
	isWithinTimeFrame: boolean
) {
	allConnectionStatus = allConnectionStatus.reverse();
	if (!isWithinTimeFrame) {
		if (
			allConnectionStatus[allConnectionStatus.length - 1].status ===
			'disconnected'
		) {
			return `Bro it be dead since - ${new Date(
				allConnectionStatus[allConnectionStatus.length - 1].time
			).toLocaleString('en-US', {
				day: '2-digit',
				month: 'short',
				hour: 'numeric',
				minute: '2-digit'
			})}`;
		}
		return 'No Disconnects in the last 24 hours';
	}

	let totalDisconnects = 0;
	for (let i = 0; i < allConnectionStatus.length; i++) {
		if (allConnectionStatus[i].status === 'disconnected') {
			totalDisconnects++;
		}
	}

	let totalDisconnectedTime = 0;
	let isConnected = false;
	let lastStatusChangeTime = 0;

	allConnectionStatus.forEach((status) => {
		if (status.status === 'disconnected' && !isConnected) {
			// Mark the start of a disconnected period
			lastStatusChangeTime = status.time;
			isConnected = true;
		} else if (status.status === 'connected' && isConnected) {
			// Calculate and accumulate disconnected time
			totalDisconnectedTime += status.time - lastStatusChangeTime;
			isConnected = false;
		}
	});

	// If the last status was disconnected, add the time until now
	if (isConnected) {
		totalDisconnectedTime += Date.now() - lastStatusChangeTime;
	}

	if (totalDisconnects === 0) {
		return 'No Disconnects in the last 24 hours';
	}
	return `${totalDisconnectsToString(
		totalDisconnects
	)} with ${millisecondsToReadableTime(
		totalDisconnectedTime
	)} of downtime in 24 hours`;
}

function totalDisconnectsToString(totalDisconnects: number) {
	if (totalDisconnects > 1) {
		return `Disconnected ${totalDisconnects} times`;
	} else if (totalDisconnects === 1) {
		return `Disconnected 1 time`;
	}
}

function millisecondsToReadableTime(milliseconds: number) {
	// Define constants for time units in milliseconds
	const msPerSecond = 1000;
	const msPerMinute = 60 * msPerSecond;
	const msPerHour = msPerMinute * 60;
	const msPerDay = msPerHour * 24;

	// Calculate the number of days, hours, minutes, and seconds
	const days = Math.floor(milliseconds / msPerDay);
	milliseconds %= msPerDay;
	const hours = Math.floor(milliseconds / msPerHour);
	milliseconds %= msPerHour;
	const minutes = Math.floor(milliseconds / msPerMinute);
	milliseconds %= msPerMinute;
	const seconds = Math.floor(milliseconds / msPerSecond);

	// Format a unit with "s" when plural
	const formatUnit = (value: number, unit: string) => {
		if (value === 1) {
			return `${value} ${unit}`;
		}
		return `${value} ${unit}s`;
	};

	// Initialize an array to store the formatted time parts
	const parts = [];

	// Add units to the array as needed, pluralized when appropriate
	if (days > 0) {
		parts.push(formatUnit(days, 'day'));
	}
	if (hours > 0) {
		parts.push(formatUnit(hours, 'hour'));
	}
	if (minutes > 0) {
		parts.push(formatUnit(minutes, 'minute'));
	}
	if (seconds > 0) {
		parts.push(formatUnit(seconds, 'second'));
	}

	// Join the formatted time parts into a human-readable string
	return parts.join(', ');
}

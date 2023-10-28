'use client';

import { useEffect, useState } from 'react';
import { allConnectionStatusType } from './Dashboard.server';
import DashboardCardBase from './DashboardBase.server';

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
	useEffect(() => {
		setFinalText(
			parseAllConnectionStatus(allConnectionStatus, isWithinTimeFrame)
		);
		setBackgroundColor(dashboardColor(allConnectionStatus));
	}, []);
	return (
		<>
			<DashboardCardBase backgroundColor={backgroundColor}>
				<div className="text-xl font-bold">{finalText}</div>
			</DashboardCardBase>
		</>
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
	if (!isWithinTimeFrame) {
		if (
			allConnectionStatus[allConnectionStatus.length - 1].status ===
			'disconnected'
		) {
			return 'Bro it be dead';
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
	)} with ${millisecondsToReadableTime(totalDisconnectedTime)} in 24 hours`;
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
	return parts.join(' ');
}

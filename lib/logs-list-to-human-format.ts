import { connectionLogsList } from '@/app/components/dashboard/Dashboard.server';

export function connectionLogsListToHumanFormat(
	allConnectionLogs: connectionLogsList,
	totalDays = 1
) {
	const totalDaysString =
		totalDays > 1 ? `last ${totalDays} days` : `past 24 hours`;

	const noDisconnectsReturnString = `No Disconnects in ${totalDaysString}`;
	if (allConnectionLogs.length === 0) {
		return noDisconnectsReturnString;
	}
	allConnectionLogs = allConnectionLogs.reverse();

	// Get the last log and check if its within the time frame of totalDays
	let isWithinTimeFrame = false;
	const lastLog = allConnectionLogs[allConnectionLogs.length - 1];
	const lastLogTime = new Date(lastLog.time).getTime();
	const now = Date.now();
	const timeDifference = now - lastLogTime;
	if (timeDifference < totalDays * 86400000) {
		isWithinTimeFrame = true;
	}

	if (!isWithinTimeFrame) {
		if (
			allConnectionLogs[allConnectionLogs.length - 1].status === 'disconnected'
		) {
			return `Bro it be dead since - ${new Date(
				allConnectionLogs[allConnectionLogs.length - 1].time
			).toLocaleString('en-US', {
				day: '2-digit',
				month: 'short',
				hour: 'numeric',
				minute: '2-digit'
			})}`;
		}
		return noDisconnectsReturnString;
	}

	let totalDisconnects = 0;
	for (let i = 0; i < allConnectionLogs.length; i++) {
		if (allConnectionLogs[i].status === 'disconnected') {
			totalDisconnects++;
		}
	}

	let totalDowntimeInMS = 0;
	let isConnected = false;
	let lastStatusChangeTime = 0;

	// If the first status is connected, add time from start of total days to until first connect
	if (allConnectionLogs[0].status === 'connected') {
		if (allConnectionLogs[0].id !== 1) {
			const totalDaysInMS = totalDays * 86400000;
			const startTime = Date.now() - totalDaysInMS; // This basically creates a virtual disconnect at the start of the list
			totalDowntimeInMS += allConnectionLogs[0].time - startTime;
		}
	}

	allConnectionLogs.forEach((status) => {
		if (status.status === 'disconnected' && !isConnected) {
			// Mark the start of a disconnected period
			lastStatusChangeTime = status.time;
			isConnected = true;
		} else if (status.status === 'connected' && isConnected) {
			// Calculate and accumulate disconnected time
			totalDowntimeInMS += status.time - lastStatusChangeTime;
			isConnected = false;
		}
	});

	// If the last status was disconnected, add the time until now
	if (isConnected) {
		totalDowntimeInMS += Date.now() - lastStatusChangeTime;
	}

	if (totalDisconnects === 0 && totalDowntimeInMS === 0) {
		return noDisconnectsReturnString;
	}

	// This will happen when there is no disconnect within the time frame of totalDays but there is a downtime
	if (totalDisconnects === 0 && totalDowntimeInMS !== 0) {
		totalDisconnects = 1;
	}
	const totalDisconnectsString = totalDisconnectsToString(totalDisconnects);
	const totalDowntimeString = millisecondsToReadableTime(totalDowntimeInMS);

	return `${totalDisconnectsString} with ${totalDowntimeString} of downtime in ${totalDaysString}`;
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

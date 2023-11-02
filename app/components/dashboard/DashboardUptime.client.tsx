'use client';

import { useMemo, useEffect, useState } from 'react';

export default function DashboardUptime({ uptime }: { uptime: string }) {
	let uptimeInt = parseInt(uptime.split(' ')[0]);
	const [humanReadableUptime, setHumanReadableUptime] = useState('');
	useMemo(() => {
		setHumanReadableUptime(formatRouterUpTime(uptimeInt));
	}, []);
	useEffect(() => {
		setInterval(() => {
			uptimeInt = uptimeInt + 1;
			setHumanReadableUptime(formatRouterUpTime(uptimeInt));
		}, 60000);
	}, []);

	return <>Uptime: {humanReadableUptime}</>;
}

function formatRouterUpTime(totalSeconds: number) {
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
	const days = Math.floor(totalSeconds / (3600 * 24));

	const minutesStr = minutes > 0 ? minutes.toString().padStart(2, '0') : '00';
	const hoursStr = hours > 0 ? hours.toString().padStart(2, '0') + ':' : '00:';
	const daysStr = days > 0 ? days + (days === 1 ? ` day, ` : ` days, `) : '';

	return `${daysStr}${hoursStr}${minutesStr}`.replace(/,\s*$/, '');
}

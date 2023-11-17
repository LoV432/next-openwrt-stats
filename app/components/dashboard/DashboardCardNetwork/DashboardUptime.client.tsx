'use client';

import { useMemo, useEffect, useState } from 'react';
import { formatUpTime } from '@/lib/format-uptime';

export default function DashboardUptime({ uptime }: { uptime: string }) {
	let uptimeInt = parseInt(uptime.split(' ')[0]);
	const [humanReadableUptime, setHumanReadableUptime] = useState('');
	useMemo(() => {
		setHumanReadableUptime(formatUpTime(uptimeInt));
	}, []);
	useEffect(() => {
		setInterval(() => {
			uptimeInt = uptimeInt + 1;
			setHumanReadableUptime(formatUpTime(uptimeInt));
		}, 60000);
	}, []);

	return <>Uptime: {humanReadableUptime}</>;
}

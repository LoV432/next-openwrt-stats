'use client';

import { useEffect, useState, useRef } from 'react';
import { formatUpTime } from '@/lib/format-uptime';

export default function DashboardUptime({ uptime }: { uptime: string }) {
	const uptimeInt = useRef(parseInt(uptime.split(' ')[0]));
	const [humanReadableUptime, setHumanReadableUptime] = useState(
		formatUpTime(uptimeInt.current)
	);
	useEffect(() => {
		const interval = setInterval(() => {
			uptimeInt.current = uptimeInt.current + 60;
			setHumanReadableUptime(formatUpTime(uptimeInt.current));
		}, 60000);

		return () => clearInterval(interval);
	}, []);

	return <>Uptime: {humanReadableUptime}</>;
}

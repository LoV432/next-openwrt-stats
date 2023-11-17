import { db } from '@/lib/db';
import { DashboardCardCurrentStatus } from './DashboardCardCurrentStatus/DashboardCardCurrentStatus.client';
import DashboardCardTotalDisconnectTime from './DashboardCardTotalDisconnectTime/DashboardCardTotalDisconnectTime.client';
import { connectionLogsListToHumanFormat } from '@/lib/logs-list-to-human-format';
import { getPppoeStatus } from '@/lib/get-pppoe-status';
import { formatUpTime } from '@/lib/format-uptime';
import DashboardCardNetWork from './DashboardCardNetwork/DashboardCardNetwork.server';

export type connectionLogsList = {
	id: number;
	status: string;
	time: number;
}[];
export default async function Dashboard() {
	let now = Date.now();
	let yesterday = now - 86400000;
	let allConnectionLogsFromServer = db
		.prepare('SELECT * FROM connectionlogs WHERE time > ? ORDER BY id DESC')
		.all(yesterday) as connectionLogsList;
	if (allConnectionLogsFromServer.length === 0) {
		allConnectionLogsFromServer = db
			.prepare('SELECT * FROM connectionlogs ORDER BY id DESC LIMIT 1')
			.all() as connectionLogsList;
	}
	let humanReadableDisconnectedTimePrerender = connectionLogsListToHumanFormat(
		allConnectionLogsFromServer
	);
	let currentStatusPrerender = allConnectionLogsFromServer[0].status;

	const pppoeStatus = await getPppoeStatus();
	let ip: string;
	let pppoeUptime: string;
	if ('up' in pppoeStatus && pppoeStatus.up) {
		ip = pppoeStatus['ipv4-address'][0].address;
		pppoeUptime = formatUpTime(pppoeStatus.uptime);
	} else {
		ip = 'N/A';
		pppoeUptime = 'N/A';
	}

	return (
		<>
			<DashboardCardNetWork />
			<DashboardCardCurrentStatus
				currentStatusPrerender={currentStatusPrerender}
				ip={ip}
				pppoeUptime={pppoeUptime}
			/>
			<DashboardCardTotalDisconnectTime
				humanReadableDisconnectedTimePrerender={
					humanReadableDisconnectedTimePrerender
				}
			/>
		</>
	);
}

import { db } from '@/lib/db';
import { DashboardCardCurrentStatus } from './DashboardCardCurrentStatus/DashboardCardCurrentStatus.client';
import DashboardCardTotalDisconnectTime from './DashboardCardTotalDisconnectTime/DashboardCardTotalDisconnectTime.client';
import { connectionLogsListToHumanFormat } from '@/lib/logs-list-to-human-format';
import { getPppoeStatus, pppoeStatusReturnType } from '@/lib/get-pppoe-status';
import DashboardCardNetWork from './DashboardCardNetwork/DashboardCardNetwork.server';

export type connectionLogsList = {
	id: number;
	status: string;
	time: number;
}[];
export default async function Dashboard() {
	const now = Date.now();
	const yesterday = now - 86400000;
	const allConnectionLogsFromServer = db
		.prepare('SELECT * FROM connectionlogs WHERE time > ? ORDER BY id DESC')
		.all(yesterday) as connectionLogsList;
	const humanReadableDisconnectedTimePrerender =
		connectionLogsListToHumanFormat(allConnectionLogsFromServer);

	const pppoeStatus = await getPppoeStatus();
	let pppoeStatusPrerender: pppoeStatusReturnType;
	if ('up' in pppoeStatus) {
		pppoeStatusPrerender = pppoeStatus;
	} else {
		pppoeStatusPrerender = {
			up: false,
			ip: '',
			uptime: 0
		};
	}

	return (
		<>
			<DashboardCardNetWork />
			<DashboardCardCurrentStatus pppoeStatusPrerender={pppoeStatusPrerender} />
			<DashboardCardTotalDisconnectTime
				humanReadableDisconnectedTimePrerender={
					humanReadableDisconnectedTimePrerender
				}
			/>
		</>
	);
}

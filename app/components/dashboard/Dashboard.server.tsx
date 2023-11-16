import { db } from '@/lib/db';
import { DashboardCardCurrentStatus } from './DashboardCardCurrentStatus.client';
import DashboardUptime from './DashboardUptime.client';
import DashboardCardTotalDisconnectTime from './DashboardCardTotalDisconnectTime.client';
import SpeedMeter from './SpeedMeter.client';
import { getUptime } from '@/lib/get-uptime';
import { connectionLogsListToHumanFormat } from '@/lib/logs-list-to-human-format';
import { getPppoeStatus } from '@/lib/get-pppoe-status';
import { formatUpTime } from '@/lib/format-uptime';

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

async function DashboardCardNetWork() {
	let uptime = await getUptime();
	return (
		<>
			<div className="card w-full border border-white border-opacity-40 bg-zinc-900 sm:w-96">
				<div className="card-body justify-center">
					<div className="border-b-2 border-white border-opacity-20 px-2 pb-3">
						<DashboardUptime uptime={uptime} />
					</div>
					<div>
						<div className="my-3">
							<SpeedMeter
								type="Download"
								maxSpeed={parseInt(process.env.MAX_DOWNLOAD_SPEED || '15')}
							/>
						</div>
						<div>
							<SpeedMeter
								type="Upload"
								maxSpeed={parseInt(process.env.MAX_UPLOAD_SPEED || '15')}
							/>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

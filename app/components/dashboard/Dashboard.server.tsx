import { db } from '@/lib/db';
import { DashboardCardCurrentStatus } from './DashboardCardCurrentStatus.client';
import DashboardCardBase from './DashboardBase.server';
import DashboardUptime from './DashboardUptime.client';
import DashboardCardTotalDisconnectTime from './DashboardCardTotalDisconnectTime.client';
import SpeedMeter from './SpeedMeter.client';
import { getUptime } from '@/lib/get-uptime';

export type allConnectionStatusType = {
	id: number;
	status: string;
	time: number;
}[];
export default function Dashboard() {
	let now = Date.now();
	let yesterday = now - 86400000;
	let isWithinTimeFrame = true;
	let allConnectionStatus = db
		.prepare('SELECT * FROM connectionlogs WHERE time > ?')
		.all(yesterday) as allConnectionStatusType;
	if (!allConnectionStatus) {
		allConnectionStatus = db
			.prepare('SELECT * FROM connectionlogs ORDER BY column DESC LIMIT 1')
			.all() as allConnectionStatusType;
		isWithinTimeFrame = false;
	}
	return (
		<>
			<DashboardCardNetWork />
			<DashboardCardCurrentStatus allConnectionStatus={allConnectionStatus} />
			<DashboardCardTotalDisconnectTime
				allConnectionStatus={allConnectionStatus}
				isWithinTimeFrame={isWithinTimeFrame}
			/>
		</>
	);
}

async function DashboardCardNetWork() {
	let uptime = await getUptime();
	return (
		<>
			<DashboardCardBase backgroundColor="bg-base-100">
				<div className="border-b-2 border-white border-opacity-20 px-2 pb-3">
					<DashboardUptime uptime={uptime} />
				</div>
				<div>
					<div className="my-3">
						<SpeedMeter upload={false} />
					</div>
					<div>
						<SpeedMeter upload={true} />
					</div>
				</div>
			</DashboardCardBase>
		</>
	);
}

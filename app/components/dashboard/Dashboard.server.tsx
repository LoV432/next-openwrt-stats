import { db } from '@/lib/db';
import { DashboardCardCurrentStatus } from './DashboardCardCurrentStatus.client';
import DashboardCardBase from './DashboardBase.server';
import DashboardUptime from './DashboardUptime.client';

export type allConnectionStatusType = {
	id: number;
	status: string;
	time: number;
}[];
export default function Dashboard() {
	let allConnectionStatus = db
		.prepare('SELECT * FROM connectionlogs')
		.all() as allConnectionStatusType;
	return (
		<>
			<DashboardCardNetWork />
			<DashboardCardCurrentStatus allConnectionStatus={allConnectionStatus} />
			<DashboardCardTotalDisconnectTime
				totalDisconnects={4}
				totalDowntime={0}
			/>
		</>
	);
}

async function DashboardCardNetWork() {
	let uptime = (await fetch(`${process.env.NEXT_PUBLIC_URL}/api/get-uptime`, {
		cache: 'no-cache'
	}).then((res) => res.json())) as string;
	return (
		<>
			<DashboardCardBase backgroundColor="bg-base-100">
				<div className="border-b-2 border-white border-opacity-20 px-2 pb-3">
					<DashboardUptime uptime={uptime} />
				</div>
				<div>
					<div className="my-3">
						<SpeedMeter mbpsInNumber={30} precentage={50} />
					</div>
					<div>
						<SpeedMeter mbpsInNumber={20} precentage={20} />
					</div>
				</div>
			</DashboardCardBase>
		</>
	);
}

function DashboardCardTotalDisconnectTime({
	totalDisconnects,
	totalDowntime
}: {
	totalDisconnects: number;
	totalDowntime: number;
}) {
	let status = totalDisconnects > 0 ? 'bg-red-800' : 'bg-emerald-700';
	return (
		<>
			<DashboardCardBase backgroundColor={status}>
				<div className="text-xl font-bold">
					Disconnected {totalDisconnects} times with 4 Hours, 32 Mintues, 30
					Senconds of downtime in 24 hours
				</div>
			</DashboardCardBase>
		</>
	);
}

function SpeedMeter({
	precentage,
	mbpsInNumber
}: {
	precentage: number;
	mbpsInNumber: number;
}) {
	return (
		<>
			<progress
				className="progress progress-error w-56"
				value={precentage}
				max="100"
			></progress>
			<p>{mbpsInNumber} Mbps</p>
		</>
	);
}

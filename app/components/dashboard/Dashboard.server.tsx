import DashboardUptime from './DashboardUptime.client';
export default function Dashboard() {
	return (
		<>
			<DashboardCardNetWork />
			<DashboardCardCurrentStatus isConnected={true} />
			<DashboardCardTotalDisconnectTime
				totalDisconnects={4}
				totalDowntime={0}
			/>
		</>
	);
}

function DashboardCardBase({
	children,
	backgroundColor
}: {
	children: React.ReactNode;
	backgroundColor: string;
}) {
	return (
		<div className={`card w-full sm:w-96 ${backgroundColor} shadow-xl`}>
			<div className="card-body justify-center">{children}</div>
		</div>
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

function DashboardCardCurrentStatus({ isConnected }: { isConnected: boolean }) {
	let status = isConnected ? 'bg-emerald-700' : 'bg-red-800';
	return (
		<>
			<DashboardCardBase backgroundColor={status}>
				<div className="text-2xl font-bold">
					<h1>Current Stauts:</h1>
					<h1>Connected</h1>
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

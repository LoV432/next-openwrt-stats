export default function Home() {
	return (
		<div className="main-container min-h-screen w-full bg-black text-white">
			<div className="flex min-h-screen w-full flex-col">
				<div className="m-5 flex h-fit flex-row flex-wrap justify-evenly gap-5">
					<DashboardCardNetWork />
					<DashboardCardCurrentStatus isConnected={true} />
					<DashboardCardTotalDisconnectTime
						totalDisconnects={4}
						totalDowntime={0}
					/>
				</div>
				<div className="flex flex-row flex-wrap justify-evenly">
					<UserCard
						name="Chloe Android"
						ip="192.168.23.102"
						macAddress="K8-3F-GG-2D-69-32"
						lastUpdated="15 hours ago"
						deviceType="android"
					/>
					<UserCard
						name="Chloe Android"
						ip="192.168.23.102"
						macAddress="K8-3F-GG-2D-69-32"
						lastUpdated="15 hours ago"
						deviceType="android"
					/>
					<UserCard
						name="Chloe Android"
						ip="192.168.23.102"
						macAddress="K8-3F-GG-2D-69-32"
						lastUpdated="15 hours ago"
						deviceType="android"
					/>
					<UserCard
						name="Chloe Android"
						ip="192.168.23.102"
						macAddress="K8-3F-GG-2D-69-32"
						lastUpdated="15 hours ago"
						deviceType="android"
					/>
					<UserCard
						name="Chloe Android"
						ip="192.168.23.102"
						macAddress="K8-3F-GG-2D-69-32"
						lastUpdated="15 hours ago"
						deviceType="android"
					/>
				</div>
			</div>
		</div>
	);
}

export function UserCard({
	name,
	ip,
	macAddress,
	lastUpdated,
	deviceType
}: {
	name: string;
	ip: string;
	macAddress: string;
	lastUpdated: string;
	deviceType: string;
}) {
	return (
		<div className="card card-side m-5 w-full bg-base-100 shadow-xl sm:w-[400px] md:w-[400px] lg:max-w-[700px]">
			<figure className="w-1/3 p-4">
				<img className="" src={`/${deviceType}.svg`} alt={deviceType} />
			</figure>
			<div className="card-body w-2/3 pl-3">
				<h2 className="card-title border-b border-white border-opacity-30 pb-2">
					{name}
				</h2>
				<h2 className="card-title border-b border-white border-opacity-30 pb-2">
					{ip}
				</h2>
				<h2 className="card-title line-clamp-1 border-b border-white border-opacity-30 pb-2">
					{macAddress}
				</h2>
				<h2 className="card-title border-b border-white border-opacity-30 pb-2">
					{lastUpdated}
				</h2>
			</div>
		</div>
	);
}

export function DashboardCardBase({
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

export function DashboardCardNetWork() {
	return (
		<>
			<DashboardCardBase backgroundColor="bg-base-100">
				<div className="border-b-2 border-white border-opacity-20 px-2 pb-3">
					Uptime 7 Days, 14:03
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

export function DashboardCardCurrentStatus({
	isConnected
}: {
	isConnected: boolean;
}) {
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

export function DashboardCardTotalDisconnectTime({
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

export function SpeedMeter({
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

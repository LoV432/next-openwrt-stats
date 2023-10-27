import Dashboard from './components/dashboard/Dashboard.server';
export default function Home() {
	return (
		<div className="main-container min-h-screen w-full bg-black text-white">
			<div className="flex min-h-screen w-full flex-col">
				<div className="m-5 flex h-fit flex-row flex-wrap justify-evenly gap-5">
					<Dashboard />
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

function UserCard({
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

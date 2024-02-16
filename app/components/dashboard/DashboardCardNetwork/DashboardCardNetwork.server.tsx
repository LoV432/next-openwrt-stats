import SpeedMeter from './SpeedMeter.client';
import { getUptime } from '@/lib/get-uptime';
import DashboardUptime from './DashboardUptime.client';
import { db } from '@/lib/db';
import PerUserSpeedDetails from './PerUserSpeedDetails.client';

type ipToName = {
	index_number: number;
	ip: string;
	name: string;
	display_name: string;
}[];

export default async function DashboardCardNetWork() {
	let uptime = await getUptime();
	let allUsers = db
		.prepare('SELECT index_number, ip, name, display_name FROM users')
		.all() as ipToName;
	return (
		<>
			<div className="card w-full border border-white border-opacity-40 bg-zinc-900 sm:w-96">
				<div className="card-body justify-center pb-3">
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
						<PerUserSpeedDetails allUsers={allUsers} />
					</div>
				</div>
			</div>
		</>
	);
}

import SpeedMeter from './SpeedMeter.client';
import { getUptime } from '@/lib/get-uptime';
import DashboardUptime from './DashboardUptime.client';

export default async function DashboardCardNetWork() {
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

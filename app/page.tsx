import Dashboard from './components/dashboard/Dashboard.server';
import UserCards from './components/user-cards/UserCards.server';
import SpeedBoundarie from './components/boundaries/SpeedBoundarie.client';
import BlockedDevicesBoundarie from './components/boundaries/BlockedDevicesBoundarie.server';
import { Provider } from 'jotai';
export const dynamic = 'force-dynamic';
export default function Home() {
	return (
		<div className="main-container min-h-screen w-full bg-black text-white">
			<div className="flex min-h-screen w-full flex-col">
				<Provider>
					<SpeedBoundarie>
						<div className="m-5 flex h-fit flex-row flex-wrap justify-evenly gap-5">
							<Dashboard />
						</div>
						<div className="flex flex-row flex-wrap justify-evenly">
							<BlockedDevicesBoundarie>
								<UserCards />
							</BlockedDevicesBoundarie>
						</div>
					</SpeedBoundarie>
				</Provider>
			</div>
		</div>
	);
}

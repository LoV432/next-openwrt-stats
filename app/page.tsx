import Dashboard from './components/dashboard/Dashboard.server';
import UserCards from './components/user-cards/UserCards.server';
import RecoilBoundarie from './components/boundaries/RecoilBoundarie.client';
import SpeedBoundarie from './components/boundaries/SpeedBoundarie.client';
export default function Home() {
	return (
		<div className="main-container min-h-screen w-full bg-black text-white">
			<div className="flex min-h-screen w-full flex-col">
				<RecoilBoundarie>
					<SpeedBoundarie>
						<div className="m-5 flex h-fit flex-row flex-wrap justify-evenly gap-5">
							<Dashboard />
						</div>
						<div className="flex flex-row flex-wrap justify-evenly">
							<UserCards />
						</div>
					</SpeedBoundarie>
				</RecoilBoundarie>
			</div>
		</div>
	);
}

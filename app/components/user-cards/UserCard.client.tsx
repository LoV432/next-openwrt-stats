'use client';

import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';
import { allSpeedStates } from '../boundaries/SpeedBoundarie.client';

export default function UserCard({
	name,
	ip,
	macaddress,
	lastupdated,
	devicetype
}: {
	name: string;
	ip: string;
	macaddress: string;
	lastupdated: number;
	devicetype: string;
}) {
	const [localUpdateTime, setLocalUpdateTime] = useState('');
	const [showDetails, setShowDetails] = useState(false);
	useEffect(() => {
		setLocalUpdateTime(
			new Date(lastupdated).toLocaleString('en-US', {
				day: '2-digit',
				month: 'short',
				hour: 'numeric',
				minute: '2-digit'
			})
		);
	}, []);
	return (
		<>
			<div className="card card-side m-5 h-fit w-full bg-base-100 shadow-xl sm:w-[400px] md:w-[400px] lg:max-w-[700px]">
				<UserSpeed ip={ip} />
				<figure className="w-1/4 p-4">
					<img className="" src={`/${devicetype}.svg`} alt={devicetype} />
				</figure>
				<div className="card-body w-2/3 pl-3">
					<h2 className="card-title border-b border-white border-opacity-30 pb-2">
						{name}
					</h2>
					<h2 className="card-title border-b border-white border-opacity-30 pb-2">
						{ip}
					</h2>
					{showDetails ? (
						<>
							<h2 className="card-title line-clamp-1 border-b border-white border-opacity-30 pb-2">
								{macaddress.toUpperCase()}
							</h2>
							<h2 className="card-title border-b border-white border-opacity-30 pb-2">
								{localUpdateTime || lastupdated}
							</h2>
						</>
					) : (
						<></>
					)}
					<div
						className="text-right text-sm font-semibold text-zinc-500 hover:cursor-pointer"
						onClick={() => setShowDetails(!showDetails)}
					>
						{showDetails ? 'Hide Details' : 'Show Details'}
					</div>
				</div>
			</div>
		</>
	);
}

function UserSpeed({ ip }: { ip: string }) {
	const [allSpeeds] = useRecoilState(allSpeedStates);
	const [speed, setSpeed] = useState({ upload: '', download: '' });
	useEffect(() => {
		if (!allSpeeds[0].length) return;
		allSpeeds[0].map((user) => {
			if (user.ip === ip) {
				setSpeed({
					upload: user.out,
					download: user.in
				});
			}
		});
	}, [allSpeeds]);
	return parseFloat(speed.upload) > 0 || parseFloat(speed.download) > 0 ? (
		<p className="absolute right-4">
			▲ {speed.upload} / {speed.download} ▼
		</p>
	) : (
		<></>
	);
}

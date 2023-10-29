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
			<div className="card card-side m-5 w-full bg-base-100 shadow-xl sm:w-[400px] md:w-[400px] lg:max-w-[700px]">
				<UserSpeed macaddress={macaddress} />
				<figure className="w-1/3 p-4">
					<img className="" src={`/${devicetype}.svg`} alt={devicetype} />
				</figure>
				<div className="card-body w-2/3 pl-3">
					<h2 className="card-title border-b border-white border-opacity-30 pb-2">
						{name}
					</h2>
					<h2 className="card-title border-b border-white border-opacity-30 pb-2">
						{ip}
					</h2>
					<h2 className="card-title line-clamp-1 border-b border-white border-opacity-30 pb-2">
						{macaddress.toUpperCase()}
					</h2>
					<h2 className="card-title border-b border-white border-opacity-30 pb-2">
						{localUpdateTime || lastupdated}
					</h2>
				</div>
			</div>
		</>
	);
}

function UserSpeed({ macaddress }: { macaddress: string }) {
	const [allSpeeds] = useRecoilState(allSpeedStates);
	const [speed, setSpeed] = useState({ upload: '', download: '' });
	useEffect(() => {
		if (!allSpeeds[0].length) return;
		allSpeeds[0].map((user) => {
			if (user.ip === macaddress) {
				setSpeed({
					upload: user.in,
					download: user.out
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

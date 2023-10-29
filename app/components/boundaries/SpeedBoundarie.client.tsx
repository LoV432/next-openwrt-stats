'use client';

import { useEffect } from 'react';
import { SetterOrUpdater, atom, useRecoilState } from 'recoil';

type speedReturnType = {
	mac: string;
	in: string;
	out: string;
}[];

export default function SpeedWrapper({
	children
}: {
	children: React.ReactNode;
}) {
	const [speed, setSpeed] = useRecoilState(speedState);
	useEffect(() => {
		let interval: NodeJS.Timeout;
		(async () => {
			interval = await fetchDataAndCalculateMbps(setSpeed);
		})();
		return () => {
			clearInterval(interval);
		};
	}, []);
	return <>{children}</>; //Everything inside this child will have access to speedState
}

export const speedState = atom({
	key: 'speed',
	default: [{}, {}] as [
		speedReturnType,
		{ totalMbpsUpload: number; totalMbpsDownload: number }
	]
});

async function fetchDataAndCalculateMbps(
	setSpeed: SetterOrUpdater<
		[
			speedReturnType,
			{
				totalMbpsUpload: number;
				totalMbpsDownload: number;
			}
		]
	>
) {
	const response = await fetch('/api/get-speed', { cache: 'no-cache' });
	const data = (await response.json()) as speedReturnType;
	let oldData = data;
	let newData = data;
	let tempNewData = data;
	let totalMbpsUpload = 0;
	let totalMbpsDownload = 0;

	let interval = setInterval(async () => {
		const response = await fetch('/api/get-speed', { cache: 'no-cache' });
		const data = (await response.json()) as speedReturnType;
		newData = JSON.parse(JSON.stringify(data));
		tempNewData = JSON.parse(JSON.stringify(newData));
		newData.map((user) => {
			const oldUser = oldData.find((oldUser) => oldUser.mac === user.mac);
			if (oldUser) {
				let inValue = parseInt(user.in) - parseInt(oldUser.in);
				inValue = inValue * 8;
				inValue = inValue / 1000000;
				inValue = inValue / 5;
				let outValue = parseInt(user.out) - parseInt(oldUser.out);
				outValue = outValue * 8;
				outValue = outValue / 1000000;
				outValue = outValue / 5;
				user.in = inValue.toFixed(2);
				user.out = outValue.toFixed(2);
			}
		});
		oldData = JSON.parse(JSON.stringify(tempNewData));
		totalMbpsDownload = 0;
		totalMbpsUpload = 0;
		newData.map((user) => {
			totalMbpsUpload += parseInt(user.out);
			totalMbpsDownload += parseInt(user.in);
		});
		setSpeed([
			newData,
			{
				totalMbpsUpload: totalMbpsUpload,
				totalMbpsDownload: totalMbpsDownload
			}
		]);
	}, 5000);
	return interval;
}
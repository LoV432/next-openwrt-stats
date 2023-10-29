'use client';

import { useEffect } from 'react';
import { SetterOrUpdater, atom, useRecoilState } from 'recoil';

type allUsersSpeedType = {
	mac: string;
	in: string;
	out: string;
}[];

export default function SpeedWrapper({
	children
}: {
	children: React.ReactNode;
}) {
	const [speed, setSpeed] = useRecoilState(allSpeedStates);
	useEffect(() => {
		let interval: NodeJS.Timeout;
		(async () => {
			interval = await fetchDataAndCalculateMbps(setSpeed);
		})();
		return () => {
			clearInterval(interval);
		};
	}, []);
	return <>{children}</>; //Everything inside this child will have access to allSpeedStates
}

export const allSpeedStates = atom({
	key: 'speed',
	default: [{}, {}] as [
		allUsersSpeedType,
		{ totalMbpsUpload: string; totalMbpsDownload: string }
	]
});

async function fetchDataAndCalculateMbps(
	setSpeed: SetterOrUpdater<
		[
			allUsersSpeedType,
			{
				totalMbpsUpload: string;
				totalMbpsDownload: string;
			}
		]
	>
) {
	const response = await fetch('/api/get-speed', { cache: 'no-cache' });
	const data = (await response.json()) as allUsersSpeedType;
	let oldData = data;
	let newData = data;
	let tempNewData = data;
	let totalMbpsUpload = 0;
	let totalMbpsDownload = 0;

	let interval = setInterval(async () => {
		const response = await fetch('/api/get-speed', { cache: 'no-cache' });
		const data = (await response.json()) as allUsersSpeedType;
		newData = JSON.parse(JSON.stringify(data));
		tempNewData = JSON.parse(JSON.stringify(newData));
		newData.map((user) => {
			const oldUser = oldData.find((oldUser) => oldUser.mac === user.mac);
			if (oldUser) {
				let inValue = parseFloat(user.in) - parseFloat(oldUser.in);
				inValue = inValue * 8;
				inValue = inValue / 1000000;
				inValue = inValue / 5;
				let outValue = parseFloat(user.out) - parseFloat(oldUser.out);
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
			totalMbpsUpload += parseFloat(user.out);
			totalMbpsDownload += parseFloat(user.in);
		});
		setSpeed([
			newData,
			{
				totalMbpsUpload: totalMbpsUpload.toFixed(2),
				totalMbpsDownload: totalMbpsDownload.toFixed(2)
			}
		]);
	}, 5000);
	return interval;
}

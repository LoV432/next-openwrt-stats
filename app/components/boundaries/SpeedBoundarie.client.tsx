'use client';

import { useEffect } from 'react';
import { SetterOrUpdater, atom, useRecoilState } from 'recoil';

type allUsersSpeedType = {
	ip: string;
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
		fetchDataAndCalculateMbps(setSpeed);
	}, []);
	return <>{children}</>; // Everything inside this child will have access to allSpeedStates
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
	let lastFetchTime = Date.now();
	const data = (await response.json()) as allUsersSpeedType;
	let oldData = data;
	let newData = data;
	let tempNewData = data;
	let totalMbpsUpload = 0;
	let totalMbpsDownload = 0;

	// Apparently you cant use await inside setInterval so we use a while loop
	// TODO: Does this need cleanup? or maybe just use https://www.npmjs.com/package/set-interval-async instead and reset to old interval code
	while (true) {
		await new Promise((resolve) => setTimeout(resolve, 2000)); // TODO: make this dynamic using env vars?
		const response = await fetch('/api/get-speed', { cache: 'no-cache' });

		// calculate time elapsed since last fetch
		const currentTime = Date.now();
		const timeElapsed = (currentTime - lastFetchTime) / 1000;
		lastFetchTime = currentTime;

		const data = (await response.json()) as allUsersSpeedType;
		if (response.status !== 200) {
			return;
		}
		newData = JSON.parse(JSON.stringify(data));
		tempNewData = JSON.parse(JSON.stringify(newData));
		newData.map((user) => {
			const oldUser = oldData.find((oldUser) => oldUser.ip === user.ip);
			if (oldUser) {
				let inValue = parseFloat(user.in) - parseFloat(oldUser.in);
				inValue = inValue * 8;
				inValue = inValue / 1000000;
				inValue = inValue / timeElapsed;
				let outValue = parseFloat(user.out) - parseFloat(oldUser.out);
				outValue = outValue * 8;
				outValue = outValue / 1000000;
				outValue = outValue / timeElapsed;
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
	}
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function calcMbps(prev: number[], curr: number[]) {
	const [t1, rx1, , tx1] = prev;
	const [t2, rx2, , tx2] = curr;

	const dt = t2 - t1;
	const drx = rx2 - rx1;
	const dtx = tx2 - tx1;

	if (dt <= 0) return { rxMbps: 0, txMbps: 0 };

	const rxMbps = (drx * 8) / dt / 1_000_000;
	const txMbps = (dtx * 8) / dt / 1_000_000;

	return {
		rxMbps: Number(rxMbps.toFixed(2)),
		txMbps: Number(txMbps.toFixed(2))
	};
}

export function secondsToHumanReadable(seconds: number) {
	const days = Math.floor(seconds / (60 * 60 * 24));
	seconds %= 60 * 60 * 24;
	const hours = Math.floor(seconds / (60 * 60));
	seconds %= 60 * 60;
	const minutes = Math.floor(seconds / 60);
	seconds %= 60;
	return [days, hours, minutes, seconds]
		.map((value, index) => {
			if (value === 0) return null;
			return `${value.toFixed(0)}${['d', 'h', 'm', 's'][index]}`;
		})
		.filter((value) => value !== null)
		.join(' ');
}

export function formatBytes(bytes: number, decimals = 2) {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

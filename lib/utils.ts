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

	if (dt <= 0) throw new Error('Invalid timestamp difference');

	const rxMbps = (drx * 8) / dt / 1_000_000;
	const txMbps = (dtx * 8) / dt / 1_000_000;

	return {
		rxMbps: Number(rxMbps.toFixed(2)),
		txMbps: Number(txMbps.toFixed(2))
	};
}

import { allConnectionStatusType } from '@/app/components/dashboard/Dashboard.server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const daysParam = searchParams.get('days');

	if (!daysParam || daysParam === '' || isNaN(parseInt(daysParam))) {
		const yesterday = Date.now() - 86400000;
		const allConnectionStatus = db
			.prepare('SELECT * FROM connectionlogs WHERE time > ? ORDER BY id DESC')
			.all(yesterday) as allConnectionStatusType;
		return new Response(JSON.stringify(allConnectionStatus), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}

	const days = parseInt(daysParam);
	const daysInEpoch = days * 86400000;
	const daysToSearch = Date.now() - daysInEpoch;
	const allConnectionStatus = db
		.prepare(`SELECT * FROM connectionlogs WHERE time > ? ORDER BY id DESC`)
		.all(daysToSearch) as allConnectionStatusType;

	return new Response(JSON.stringify(allConnectionStatus), {
		status: 200,
		headers: {
			'Content-Type': 'application/json'
		}
	});
}

import { connectionLogsList } from '@/app/components/dashboard/Dashboard.server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const daysParam = searchParams.get('days');

	if (!daysParam || daysParam === '' || isNaN(parseInt(daysParam))) {
		const yesterday = Date.now() - 86400000;
		const requestedConnectionLogs = db
			.prepare('SELECT * FROM connectionlogs WHERE time > ? ORDER BY id DESC')
			.all(yesterday) as connectionLogsList;
		return new Response(JSON.stringify(requestedConnectionLogs), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}

	if (daysParam === '-1') {
		const lastConnectionLog = db
			.prepare('SELECT * FROM connectionlogs ORDER BY id DESC LIMIT 1')
			.all() as connectionLogsList;
		return new Response(JSON.stringify(lastConnectionLog), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	}

	const days = parseInt(daysParam);
	const daysInEpoch = days * 86400000;
	const daysToSearch = Date.now() - daysInEpoch;
	const requestedConnectionLogs = db
		.prepare(`SELECT * FROM connectionlogs WHERE time > ? ORDER BY id DESC`)
		.all(daysToSearch) as connectionLogsList;

	return new Response(JSON.stringify(requestedConnectionLogs), {
		status: 200,
		headers: {
			'Content-Type': 'application/json'
		}
	});
}

import { db } from '@/lib/db';

type connectionEventType = {
	status: string;
};

type lastConnectionEventType = {
	id: number;
	status: string;
	time: number;
};

export async function POST(request: Request) {
	const body = (await request.json()) as connectionEventType;

	if (!body.status) {
		return new Response(JSON.stringify({ error: 'Missing required fields' }), {
			status: 400
		});
	}

	let lastConnectionEvent = db
		.prepare('SELECT * FROM connectionlogs ORDER BY id DESC LIMIT 1')
		.get() as lastConnectionEventType;

	if (lastConnectionEvent.status === body.status) {
		return new Response(
			JSON.stringify({ info: 'Connection event already exists' }),
			{
				status: 200
			}
		);
	}

	let addNewConnectionEvent = db
		.prepare('INSERT INTO connectionlogs (status, time) VALUES (?, ?)')
		.run(body.status, Date.now());

	return new Response(JSON.stringify(addNewConnectionEvent), {
		status: 200
	});
}

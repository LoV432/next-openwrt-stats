import { db } from '@/lib/db';

type dhcpEventType = {
	hostname: string;
	ip: string;
	mac: string;
	type: string;
};

export type userReturnType = {
	id: number;
	index_number: number;
	display_name: string;
	name: string;
	ip: string;
	mac_address: string;
	last_updated: number;
	device_type: string;
	last_event_type: string;
};

export async function POST(request: Request) {
	const body = (await request.json()) as dhcpEventType;

	if (
		!body.hostname ||
		body.hostname === '' ||
		!body.ip ||
		body.ip === '' ||
		!body.mac ||
		body.mac === '' ||
		!body.type ||
		body.type === ''
	) {
		return new Response(JSON.stringify({ error: 'Missing required fields' }), {
			status: 400
		});
	}

	let existingMacAddress = db
		.prepare('SELECT * FROM users WHERE mac_address = ?')
		.get(body.mac) as userReturnType | undefined;
	if (existingMacAddress) {
		let userID = existingMacAddress.id;
		let updateDevice = db
			.prepare(
				'UPDATE users SET ip = ?, last_updated = ?, last_event_type = ? WHERE id = ?'
			)
			.run(body.ip, Date.now(), body.type, userID);
		return new Response(JSON.stringify(updateDevice), {
			status: 200
		});
	} else {
		let highestIndex = db
			.prepare('SELECT MAX(index_number) FROM users')
			.get() as { 'MAX(index_number)': number };
		let insertDevice = db
			.prepare(
				'INSERT INTO users (index_number, name, ip, mac_address, last_updated, device_type, last_event_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
			)
			.run(
				highestIndex['MAX(index_number)'] + 1,
				body.hostname,
				body.ip,
				body.mac,
				Date.now(),
				'generic',
				body.type
			);
		return new Response(JSON.stringify(insertDevice), {
			status: 200
		});
	}
}

import { db } from '@/lib/db';

type dhcpEventType = {
	hostname: string;
	ip: string;
	mac: string;
	type: string;
};

export type userReturnType = {
	id: number;
	indexNumber: number;
	displayName: string;
	name: string;
	ip: string;
	macaddress: string;
	lastupdated: number;
	devicetype: string;
	lastEventType: string;
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
		.prepare('SELECT * FROM users WHERE macaddress = ?')
		.get(body.mac) as userReturnType | undefined;
	if (existingMacAddress) {
		let userID = existingMacAddress.id;
		let updateDevice = db
			.prepare(
				'UPDATE users SET ip = ?, lastupdated = ?, lastEventType = ? WHERE id = ?'
			)
			.run(body.ip, Date.now(), body.type, userID);
		return new Response(JSON.stringify(updateDevice), {
			status: 200
		});
	} else {
		let highestIndex = db
			.prepare('SELECT MAX(indexNumber) FROM users')
			.get() as { 'MAX(indexNumber)': number };
		let insertDevice = db
			.prepare(
				'INSERT INTO users (indexNumber, name, ip, macaddress, lastupdated, devicetype, lastEventType) VALUES (?, ?, ?, ?, ?, ?, ?)'
			)
			.run(
				highestIndex['MAX(indexNumber)'] + 1,
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

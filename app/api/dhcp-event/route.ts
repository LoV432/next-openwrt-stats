import { db } from '@/lib/db';

type dhcpEventType = {
	hostname: string;
	ip: string;
	mac: string;
	type: string;
};

type userReturnType = {
	id: number;
	name: string;
	ip: string;
	macAddress: string;
	lastUpdated: number;
	deviceType: string;
	lastEventType: string;
};

export async function POST(request: Request) {
	const body = (await request.json()) as dhcpEventType;

	if (!body.hostname || !body.ip || !body.mac || !body.type) {
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
		let insertDevice = db
			.prepare(
				'INSERT INTO users (name, ip, macaddress, lastupdated, devicetype, lastEventType) VALUES (?, ?, ?, ?, ?)'
			)
			.run(body.hostname, body.ip, body.mac, Date.now(), 'generic', body.type);
		return new Response(JSON.stringify(insertDevice), {
			status: 200
		});
	}
}

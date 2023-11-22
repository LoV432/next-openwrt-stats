import { db } from '@/lib/db';
import { getSpeed } from '../get-speed/route';

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

	await syncWithGetSpeedUsers();

	let existingMacAddress = db
		.prepare('SELECT * FROM users WHERE mac_address = ?')
		.get(body.mac) as userReturnType | undefined;
	if (existingMacAddress) {
		let userID = existingMacAddress.id;
		let updateDevice = db
			.prepare(
				'UPDATE users SET ip = ?, last_updated = ?, last_event_type = ?, name = ? WHERE id = ?'
			)
			.run(body.ip, Date.now(), body.type, body.hostname, userID);
		return new Response(JSON.stringify(updateDevice), {
			status: 200
		});
	} else {
		let insertDevice = addNewUser({ user: body });
		return new Response(JSON.stringify(insertDevice), {
			status: 200
		});
	}
}

async function syncWithGetSpeedUsers() {
	const allMacsFromDB = db.prepare('SELECT mac_address FROM users').all() as {
		mac_address: string;
	}[];

	const getSpeedUsers = await getSpeed();

	// If no users in getSpeed, exit
	if ('error' in getSpeedUsers) {
		return false;
	}

	// If users in getSpeed
	const usersSpeed = JSON.parse(getSpeedUsers.data) as [
		{ mac: string; ip: string; in: string; out: string }
	];

	// Extract all macs and ips from userspeed
	const allUsersFromUsersSpeed = usersSpeed.map((user) => {
		return {
			mac_address: user.mac,
			ip: user.ip
		};
	});

	// Add all macs that are not in the database to the database
	allUsersFromUsersSpeed.forEach((userFromUsersSpeed) => {
		if (
			!allMacsFromDB.find(
				(macFromDB) => macFromDB.mac_address === userFromUsersSpeed.mac_address
			)
		) {
			addNewUser({
				user: {
					hostname: 'Unknown',
					ip: userFromUsersSpeed.ip,
					mac: userFromUsersSpeed.mac_address,
					type: 'GET_SPEED'
				}
			});
		}
	});
	return true;
}

function addNewUser({ user }: { user: dhcpEventType }) {
	let highestIndex = db
		.prepare('SELECT MAX(index_number) FROM users')
		.get() as { 'MAX(index_number)': number };
	let insertDevice = db
		.prepare(
			'INSERT INTO users (index_number, name, ip, mac_address, last_updated, device_type, last_event_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
		)
		.run(
			highestIndex['MAX(index_number)'] + 1,
			user.hostname,
			user.ip,
			user.mac,
			Date.now(),
			'generic',
			user.type
		);

	return insertDevice;
}

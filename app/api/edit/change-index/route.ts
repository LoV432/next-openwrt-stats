import { db } from '@/lib/db';
import { userReturnType } from '../../dhcp-event/route';

type changeIndexType = {
	index: string;
	macAddress: string;
};

export async function POST(request: Request) {
	const body = (await request.json()) as changeIndexType;
	if (
		!body.index ||
		body.index === '' ||
		!body.macAddress ||
		body.macAddress === ''
	) {
		return new Response(JSON.stringify({ error: 'Missing required fields' }), {
			status: 400
		});
	}

	let currentUser = db
		.prepare('SELECT * FROM users WHERE macaddress = ?')
		.get(body.macAddress) as userReturnType | undefined;
	if (!currentUser) {
		return new Response(
			JSON.stringify({ error: 'No device with that MAC address' }),
			{
				status: 400
			}
		);
	}

	let conflictingUser = db
		.prepare('SELECT * FROM users WHERE indexNumber = ?')
		.get(body.index) as userReturnType | undefined;
	if (!conflictingUser) {
		let updateIndex = db
			.prepare('UPDATE users SET indexNumber = ? WHERE macaddress = ?')
			.run(body.index, body.macAddress);
		return new Response(JSON.stringify(updateIndex), {
			status: 200
		});
	}

	let updateIndex = db.prepare(
		'UPDATE users SET indexNumber = @index WHERE macaddress = @mac'
	);

	let updateMany = db.transaction((users: { index: number; mac: string }[]) => {
		users.forEach((user) => {
			updateIndex.run(user);
		});
	});

	let updateIndexMany = updateMany([
		{
			index: parseInt(body.index),
			mac: body.macAddress
		},
		{
			index: currentUser.indexNumber,
			mac: conflictingUser.macaddress
		}
	]);

	return new Response(JSON.stringify(updateIndexMany), {
		status: 200
	});
}

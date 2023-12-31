import { db } from '@/lib/db';
import { userReturnType } from '../../dhcp-event/route';

type deleteUserType = {
	macAddress: string;
};

export async function POST(request: Request) {
	const body = (await request.json()) as deleteUserType;

	if (!body.macAddress || body.macAddress === '') {
		return new Response(JSON.stringify({ error: 'Missing required fields' }), {
			status: 400
		});
	}

	let existingMacAddress = db
		.prepare('SELECT * FROM users WHERE mac_address = ?')
		.get(body.macAddress) as userReturnType | undefined;
	if (!existingMacAddress) {
		return new Response(
			JSON.stringify({ error: 'No device with that MAC address' }),
			{
				status: 400
			}
		);
	}
	let userID = existingMacAddress.id;
	let deleteUser = db.prepare('DELETE FROM users WHERE id = ?').run(userID);
	return new Response(JSON.stringify(deleteUser), {
		status: 200
	});
}

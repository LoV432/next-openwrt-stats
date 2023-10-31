import { db } from '@/lib/db';
import { userReturnType } from '../../dhcp-event/route';

type displayNameType = {
	macAddress: string;
	displayName: string;
};
export async function POST(request: Request) {
	const body = (await request.json()) as displayNameType;

	if (
		!body.macAddress ||
		body.macAddress === '' ||
		!body.displayName ||
		body.displayName === ''
	) {
		return new Response(JSON.stringify({ error: 'Missing required fields' }), {
			status: 400
		});
	}

	let existingMacAddress = db
		.prepare('SELECT * FROM users WHERE macaddress = ?')
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
	let updateDisplayName = db
		.prepare('UPDATE users SET displayName = ? WHERE id = ?')
		.run(body.displayName, userID);
	return new Response(JSON.stringify(updateDisplayName), {
		status: 200
	});
}

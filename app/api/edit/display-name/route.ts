import { db } from '@/lib/db';
import { userReturnType } from '../../dhcp-event/route';

type display_nameType = {
	macAddress: string;
	display_name: string;
};
export async function POST(request: Request) {
	const body = (await request.json()) as display_nameType;

	if (
		!body.macAddress ||
		body.macAddress === '' ||
		!body.display_name ||
		body.display_name === ''
	) {
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
	let updateDisplayName = db
		.prepare('UPDATE users SET display_name = ? WHERE id = ?')
		.run(body.display_name, userID);
	return new Response(JSON.stringify(updateDisplayName), {
		status: 200
	});
}

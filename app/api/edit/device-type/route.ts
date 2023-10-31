import { db } from '@/lib/db';
import { userReturnType } from '../../dhcp-event/route';

type deviceType = {
	macAddress: string;
	deviceType: string;
};

export async function POST(request: Request) {
	const body = (await request.json()) as deviceType;
	if (
		!body.macAddress ||
		body.macAddress === '' ||
		!body.deviceType ||
		body.deviceType === ''
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
	let updateDevice = db
		.prepare('UPDATE users SET deviceType = ? WHERE id = ?')
		.run(body.deviceType, userID);
	return new Response(JSON.stringify(updateDevice), {
		status: 200
	});
}

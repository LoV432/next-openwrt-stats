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
		isNaN(parseInt(body.index)) ||
		!body.macAddress ||
		body.macAddress === ''
	) {
		return new Response(JSON.stringify({ error: 'Missing required fields' }), {
			status: 400
		});
	}

	const currentUser = db
		.prepare('SELECT * FROM users WHERE mac_address = ?')
		.get(body.macAddress) as userReturnType | undefined;
	if (!currentUser) {
		return new Response(
			JSON.stringify({ error: 'No device with that MAC address' }),
			{
				status: 400
			}
		);
	}

	const transaction = db.transaction(() => {
		const selectedUser = db.prepare(
			'UPDATE users SET index_number = ? WHERE mac_address = ?'
		);

		const newIndex = currentUser.index_number;

		if (newIndex > parseInt(body.index)) {
			selectedUser.run(parseInt(body.index) - 0.5, body.macAddress);
		} else {
			selectedUser.run(parseInt(body.index) + 0.5, body.macAddress);
		}

		let index = 1;
		const allUsers = db
			.prepare('SELECT * FROM users ORDER BY index_number ASC')
			.all() as userReturnType[];

		allUsers.forEach((user) => {
			db.prepare('UPDATE users SET index_number = ? WHERE id = ?').run(
				index,
				user.id
			);
			index++;
		});

		return true;
	})();

	if (!transaction) {
		return new Response(JSON.stringify({ error: 'Failed to update index' }), {
			status: 400
		});
	}
	return new Response(
		JSON.stringify({ success: 'Index updated successfully' }),
		{
			status: 200
		}
	);
}

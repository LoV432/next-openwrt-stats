import { getWifiClients } from '@/lib/server/wifiAPs';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
	try {
		const { ifnames } = await request.json();
		if (!ifnames) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'No ifnames provided'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}
		// TODO: validate ifnames
		const response = await getWifiClients(ifnames);
		if (!response.success) {
			return new Response(JSON.stringify(response), {
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
		return new Response(JSON.stringify(response), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		console.error(error);
		return new Response(
			JSON.stringify({
				success: false,
				error: 'Something went wrong while fetching wifi clients'
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}
}

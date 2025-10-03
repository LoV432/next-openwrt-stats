import { getWifiClients } from '@/lib/server/wifiAPs';

export async function GET() {
	try {
		const response = await getWifiClients();
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

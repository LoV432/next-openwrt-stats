import { getRealTimeTraffic } from '@/lib/server/routerInterfaces';

export async function GET(request: Request) {
	try {
		const device = new URL(request.url).searchParams.get('device');
		if (!device) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'No device provided'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}
		const response = await getRealTimeTraffic(device);
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
		return new Response(
			JSON.stringify({
				success: false,
				error: 'Something went wrong while fetching real time traffic'
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

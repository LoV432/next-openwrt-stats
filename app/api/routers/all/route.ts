import { getRouters } from '@/lib/server/router';

export async function GET() {
	try {
		const response = await getRouters();
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
				error: 'Something went wrong while fetching routers'
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

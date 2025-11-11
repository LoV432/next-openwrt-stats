import { getPBRPolicy } from '@/lib/server/pbr';

export async function GET() {
	try {
		const response = await getPBRPolicy();
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
				errorMessage: 'Something went wrong while fetching pbr policy'
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

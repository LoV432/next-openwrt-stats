import { getRouter } from '@/lib/server/router';
import { ubusCall } from '@/lib/server/ubusCalls';
import { routerTimezoneSchema } from '@/types/ubusCalls';
import { NextRequest } from 'next/server';

export type getRouterTimezone =
	| {
			success: true;
			data: string;
	  }
	| {
			success: false;
			error: string;
	  };
export async function GET(request: NextRequest) {
	try {
		const displayName = request.nextUrl.searchParams.get('displayName');
		if (!displayName) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'No router IP provided'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}
		const router = await getRouter(displayName);
		if (!router.success) {
			return new Response(JSON.stringify(router), {
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}

		const response = await ubusCall({
			displayName: router.data.displayName,
			params: ['luci', 'getTimezones', {}]
		});

		if (!response.success) {
			return new Response(JSON.stringify(response), {
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}

		const parsedResponse = routerTimezoneSchema.safeParse(response.data);
		if (!parsedResponse.success) {
			console.log('[ERROR] Failed to parse router timezone', {
				displayName: router.data.displayName,
				error: parsedResponse.error
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to parse router timezone'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}
		const activeTimezone = Object.keys(parsedResponse.data.result[1]).find(
			(key) => parsedResponse.data.result[1][key].active
		);

		return new Response(
			JSON.stringify({
				success: true,
				data: activeTimezone || 'UTC'
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	} catch (error) {
		console.log('[ERROR] Failed to get router timezone', {
			error
		});
		return new Response(
			JSON.stringify({
				success: false,
				error: 'Failed to get router timezone'
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

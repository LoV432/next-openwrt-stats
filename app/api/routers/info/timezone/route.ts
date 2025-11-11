import { logError } from '@/lib/client/errorLog';
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

		const getTimezoneResponse = await ubusCall({
			displayName,
			params: ['luci', 'getTimezones', {}]
		});

		if (!getTimezoneResponse.success) {
			logError({
				displayName,
				errorMessage: 'Failed to get timezone',
				...getTimezoneResponse
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to get timezone.'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const parsedTimezoneResponse = routerTimezoneSchema.safeParse(
			getTimezoneResponse.data
		);
		if (!parsedTimezoneResponse.success) {
			logError({
				displayName,
				errorMessage: 'Failed to parse timezone.',
				zodError: parsedTimezoneResponse.error,
				...getTimezoneResponse
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to parse router timezone.'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}
		const activeTimezone = Object.keys(
			parsedTimezoneResponse.data.result[1]
		).find((key) => parsedTimezoneResponse.data.result[1][key].active);

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
		logError({
			errorMessage: 'Failed to get router timezone.',
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

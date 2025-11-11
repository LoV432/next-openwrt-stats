import { logError } from '@/lib/client/errorLog';
import { getRouter } from '@/lib/server/router';
import { ubusBatchCall } from '@/lib/server/ubusCalls';
import { routerInfoSchema } from '@/types/ubusCalls';
import { NextRequest } from 'next/server';

export type getRouterInfo =
	| {
			success: true;
			data: ReturnType<typeof routerInfoSchema.parse>;
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

		const response = await ubusBatchCall({
			displayName: router.data.displayName,
			calls: [
				{
					id: 1,
					params: ['system', 'info', {}]
				},
				{
					id: 2,
					params: ['system', 'board', {}]
				}
				// {
				// 	id: 3,
				// 	params: ['luci', 'getVersion', {}]
				// }
			]
		});

		if (!response.success) {
			logError({
				displayName: router.data.displayName,
				errorMessage: 'Failed to get router info',
				...response
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to get router info'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}
		let flattenData: { [key: string]: any } = {};
		response.data.forEach((data: any) => {
			if (data.result) {
				Object.keys(data.result[1]).forEach((key) => {
					flattenData[key] = data.result[1][key];
				});
			}
		});

		const parsedResponse = routerInfoSchema.safeParse(flattenData);
		if (!parsedResponse.success) {
			logError({
				displayName: router.data.displayName,
				errorMessage: 'Failed to parse router info',
				zodError: parsedResponse.error,
				...response
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Failed to parse router info'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		return new Response(
			JSON.stringify({
				success: true,
				data: parsedResponse.data
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
			errorMessage: 'Failed to get router info',
			error
		});
		return new Response(
			JSON.stringify({
				success: false,
				error: 'Failed to get router info'
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

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
		const routerIp = request.nextUrl.searchParams.get('routerIp');
		if (!routerIp) {
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
		const router = await getRouter(routerIp);
		if (!router.success) {
			return new Response(JSON.stringify(router), {
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}

		const response = await ubusBatchCall({
			routerIP: router.data.routerIP,
			calls: [
				{
					id: 1,
					params: ['system', 'info', {}]
				},
				{
					id: 2,
					params: ['system', 'board', {}]
				},
				{
					id: 3,
					params: ['luci', 'getVersion', {}]
				}
			]
		});

		if (!response.success) {
			return new Response(JSON.stringify(response), {
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			});
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
			console.log('[ERROR] Failed to parse router info', {
				routerIP: router.data.routerIP,
				error: parsedResponse.error
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
		console.log('[ERROR] Failed to get router info', {
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

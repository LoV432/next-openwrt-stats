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
			return Response.json({
				success: false,
				error: 'Missing routerIp'
			});
		}
		const router = await getRouter(routerIp);
		if (!router.success) {
			return Response.json({
				success: false,
				error: router.error
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
			return Response.json({
				success: false,
				error: response.error
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
			return Response.json({
				success: false,
				error: 'Failed to parse router info'
			});
		}

		return Response.json({
			success: true,
			data: parsedResponse.data
		});
	} catch (error) {
		console.log('[ERROR] Failed to get router info', {
			error
		});
		return Response.json({
			success: false,
			error: 'Failed to get router info'
		});
	}
}

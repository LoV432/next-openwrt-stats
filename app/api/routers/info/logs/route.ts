import 'server-only';
import { db } from '@/lib/server/dbDriver';
import { routersTable } from '@/drizzle/schema/schema';
import { eq } from 'drizzle-orm';
import { ubusBatchCall } from '@/lib/server/ubusCalls';
import { NextRequest } from 'next/server';
import { logError } from '@/lib/client/errorLog';

export type RouterLogs = Awaited<
	| {
			success: true;
			data:
				| {
						logs: string[];
						version: 1;
				  }
				| {
						logs: {
							msg: string;
							id: number;
							priority: number;
							source: number;
							time: number;
						}[];
						version: 2;
				  };
	  }
	| {
			success: false;
			errorMessage: string;
	  }
>;
export async function GET(request: NextRequest) {
	try {
		const displayName = request.nextUrl.searchParams.get('displayName');
		if (!displayName) {
			return new Response(
				JSON.stringify({
					success: false,
					errorMessage: 'No router name provided'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}
		const router = await db
			.select({
				routerIP: routersTable.routerIP
			})
			.from(routersTable)
			.where(eq(routersTable.displayName, displayName))
			.limit(1);

		if (!router.length) {
			logError({
				displayName,
				errorMessage: 'This router does not exist.'
			});
			return new Response(
				JSON.stringify({
					success: false,
					errorMessage: 'This router does not exist.'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const logsCall = await ubusBatchCall({
			displayName: displayName,
			calls: [
				{
					id: 1,
					params: [
						'file',
						'exec',
						{
							command: '/usr/libexec/syslog-wrapper'
						}
					]
				},
				{
					id: 2,
					params: ['log', 'read', { lines: 1000, stream: false, oneshot: true }]
				}
			]
		});

		if (!logsCall.success) {
			logError({
				displayName,
				errorMessage: 'Failed to get logs',
				...logsCall
			});
			return new Response(
				JSON.stringify({
					success: false,
					errorMessage: 'Failed to get logs.'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}
		const oldLogCall = logsCall.data.find((call) => call.id === 1);
		const newLogCall = logsCall.data.find((call) => call.id === 2);
		if (oldLogCall?.success && oldLogCall.result?.[1]?.stdout) {
			const logs = (oldLogCall.result[1].stdout as string)
				.trimEnd()
				.split('\n');
			return new Response(
				JSON.stringify({
					success: true,
					data: {
						logs,
						version: 1
					}
				}),
				{
					status: 200,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		if (newLogCall?.success && newLogCall.result?.[1]?.log) {
			const logs = newLogCall.result[1].log;
			return new Response(
				JSON.stringify({
					success: true,
					data: {
						logs,
						version: 2
					}
				}),
				{
					status: 200,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		return new Response(
			JSON.stringify({
				success: false,
				errorMessage: 'Failed to get logs.'
			}),
			{
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	} catch (error) {
		logError({
			errorMessage: 'Something went wrong while getting the router logs',
			error
		});
		return new Response(
			JSON.stringify({
				success: false,
				errorMessage: 'Failed to get router logs.'
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

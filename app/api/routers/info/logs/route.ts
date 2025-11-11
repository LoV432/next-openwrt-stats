import 'server-only';
import { db } from '@/lib/server/dbDriver';
import { routersTable } from '@/drizzle/schema/schema';
import { eq } from 'drizzle-orm';
import { ubusCall } from '@/lib/server/ubusCalls';
import { NextRequest } from 'next/server';
import { logError } from '@/lib/client/errorLog';

export type RouterLogs = Awaited<
	| {
			success: true;
			data: string[];
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

		const logsCall = await ubusCall({
			displayName: displayName,
			params: [
				'file',
				'exec',
				{
					command: '/usr/libexec/syslog-wrapper'
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

		if (!logsCall.data.result?.[1]?.stdout) {
			logError({
				displayName,
				errorMessage: 'Failed to get logs',
				...logsCall
			});
			return new Response(
				JSON.stringify({
					success: false,
					errorMessage: 'No logs found'
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
		}

		const logs = (logsCall.data.result[1].stdout as string)
			.trimEnd()
			.split('\n');
		return new Response(
			JSON.stringify({
				success: true,
				data: logs
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

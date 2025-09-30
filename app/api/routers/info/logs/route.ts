import 'server-only';
import { db } from '@/lib/server/dbDriver';
import { routersTable } from '@/drizzle/schema/schema';
import { eq } from 'drizzle-orm';
import { ubusCall } from '@/lib/server/ubusCalls';
import { NextRequest } from 'next/server';

export type RouterLogs = Awaited<
	| {
			success: true;
			data: string[];
	  }
	| {
			success: false;
			error: string;
	  }
>;
export async function GET(request: NextRequest) {
	try {
		const displayName = request.nextUrl.searchParams.get('displayName');
		if (!displayName) {
			return new Response(
				JSON.stringify({
					success: false,
					error: 'No router name provided'
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
			console.log('[INFO] No router found with router', {
				displayName
			});
			return new Response(
				JSON.stringify({
					success: false,
					error: 'No router found'
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
			return new Response(
				JSON.stringify({
					success: false,
					error: logsCall.error
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
		console.log('[ERROR] Failed to get router logs', {
			error
		});
		return new Response(
			JSON.stringify({
				success: false,
				error: 'Failed to get router logs'
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

import { NextResponse } from 'next/server';
import { getWifiClientsTraffic } from '@/lib/server/wifiAPs';

export async function POST(request: Request) {
	try {
		const body = await request.json();
		if (!body.ifnames) {
			return NextResponse.json(
				{ success: false, error: 'No ifnames provided' },
				{ status: 400 }
			);
		}
		// TODO: Validate ifnames
		const wifiClientsTraffic = await getWifiClientsTraffic(body.ifnames);
		if (!wifiClientsTraffic.success) {
			return NextResponse.json(wifiClientsTraffic, {
				status: 500,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
		return NextResponse.json(wifiClientsTraffic, {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ success: false, error: 'Something went wrong' },
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}
}

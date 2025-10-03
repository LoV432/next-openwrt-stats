import { NextResponse } from 'next/server';
import { getWifiAPsIfname } from '@/lib/server/wifiAPs';

export async function GET() {
	try {
		const wifiAPsIfname = await getWifiAPsIfname();
		if (!wifiAPsIfname.success) {
			return NextResponse.json(wifiAPsIfname, {
				status: 500,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
		return NextResponse.json(wifiAPsIfname, {
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

import { getDhcpDevices } from '@/lib/server/dhcpDevices';

export async function GET() {
	try {
		const response = await getDhcpDevices();
		if (!response.success) {
			return new Response(JSON.stringify(response), {
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}
		return new Response(JSON.stringify(response), {
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (error) {
		return new Response(
			JSON.stringify({
				success: false,
				error: 'Something went wrong while fetching dhcp devices'
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

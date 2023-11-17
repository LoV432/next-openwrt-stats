import { getPppoeStatus } from '@/lib/get-pppoe-status';

export async function GET() {
	const pppoeStatus = await getPppoeStatus();

	if ('up' in pppoeStatus) {
		return new Response(JSON.stringify(pppoeStatus), {
			status: 200
		});
	}

	return new Response(JSON.stringify(pppoeStatus), {
		status: 400
	});
}

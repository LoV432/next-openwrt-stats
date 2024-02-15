import { getSpeed } from '@/lib/get-speed';
export const dynamic = 'force-dynamic';

export async function GET() {
	let speed = await getSpeed();
	if ('error' in speed) {
		return new Response(JSON.stringify({ error: speed.error }), {
			status: 400
		});
	}
	return new Response(speed.data, {
		status: 200,
		headers: {
			'Content-Type': 'application/json'
		}
	});
}

const PORT = process.env.PORT || '3000';
const HOST = process.env.HOSTNAME || '127.0.0.1';
const PRESENCE_URL =
	process.env.PRESENCE_URL || `http://${HOST}:${PORT}/api/presence`;

async function pingPresence() {
	try {
		const res = await fetch(PRESENCE_URL, { method: 'GET' });
		if (!res.ok) {
			console.error(
				`[presence-cron] ${new Date().toISOString()} - fetch failed:`,
				res.status,
				res.statusText
			);
		}
	} catch (err) {
		console.error(
			'[presence-cron] fetch error:',
			err && err.message ? err.message : err
		);
	}
}

const ONE_MINUTE_MS = 60 * 1000;

setInterval(() => {
	pingPresence();
}, ONE_MINUTE_MS);

// Graceful shutdown
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

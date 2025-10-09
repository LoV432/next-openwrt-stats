import cron from 'node-cron';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const PRESENCE_ENABLED = process.env.PRESENCE_ENABLED === 'true';
const PRESENCE_CRON = process.env.PRESENCE_CRON || '0 * * * *';

if (PRESENCE_ENABLED) {
	cron.schedule(PRESENCE_CRON, async () => {
		await fetch('http://localhost:3000/api/presence/');
	});
}

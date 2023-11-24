import Database from 'better-sqlite3';
import fs from 'fs';

try {
	if (!fs.existsSync('./db')) {
		fs.mkdirSync('./db');
	}
} catch {}
export const db = new Database('./db/next-openwrt-stats.db');

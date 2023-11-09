import Database from 'better-sqlite3';
import fs from 'fs';

if (!fs.existsSync('./db')) {
	fs.mkdirSync('./db');
}
export const db = new Database('./db/next-openwrt-stats.db');

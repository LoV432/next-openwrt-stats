import Database from 'better-sqlite3';
import fs from 'fs';

if (!fs.existsSync('./db')) {
	fs.mkdirSync('./db');
}
export const db = new Database('./db/next-openwrt-stats.db');

const createUserTable = db.prepare(`CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT,
	ip TEXT,
	macaddress TEXT,
	lastupdated INTEGER,
	devicetype TEXT,
	lastEventType TEXT
)`);
createUserTable.run();

const createConnectionLogsTable =
	db.prepare(`CREATE TABLE IF NOT EXISTS connectionlogs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		status TEXT,
		time INTEGER
)`);
createConnectionLogsTable.run();

const rpcdTokenTable = db.prepare(`CREATE TABLE IF NOT EXISTS rpcdtoken (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	token TEXT
)`);
rpcdTokenTable.run();

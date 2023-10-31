import Database from 'better-sqlite3';
import fs from 'fs';

if (!fs.existsSync('./db')) {
	fs.mkdirSync('./db');
}
export const db = new Database('./db/next-openwrt-stats.db');

const createUserTable = db.prepare(`CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT,
	displayName TEXT,
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

const checkForEmptyConnectionsTable = db
	.prepare(`SELECT * FROM connectionlogs WHERE id = 1`)
	.get();
if (!checkForEmptyConnectionsTable) {
	db.prepare('INSERT INTO connectionlogs (status, time) VALUES (?, ?)').run(
		'connected',
		Date.now()
	);
}

const rpcdTokenTable = db.prepare(`CREATE TABLE IF NOT EXISTS rpcdtoken (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	token TEXT
)`);
rpcdTokenTable.run();

const checkToken = db.prepare(`SELECT * FROM rpcdtoken WHERE id = 1`).get();
if (!checkToken) {
	db.prepare('INSERT INTO rpcdtoken (token) VALUES (?)').run('0');
}

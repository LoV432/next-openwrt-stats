const Database = require('better-sqlite3');
const fs = require('fs');

if (!fs.existsSync('./db')) {
    fs.mkdirSync('./db');
}
const db = new Database('./db/next-openwrt-stats.db');

// TODO: How to handle DB migrations?

db.transaction(() => {
    const createUserTable = db.prepare(`CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	index_number INTEGER,
	name TEXT,
	display_name TEXT,
	ip TEXT,
	mac_address TEXT,
	last_updated INTEGER,
	device_type TEXT,
	last_event_type TEXT
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
        .prepare(`SELECT * FROM connectionlogs`)
        .get();
    if (!checkForEmptyConnectionsTable) {
        db.prepare(
            'INSERT INTO connectionlogs (id, status, time) VALUES (?, ?, ?)'
        ).run(1, 'connected', Date.now());
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
})();

import { relations } from 'drizzle-orm/relations';
import { int, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

export const routersTable = sqliteTable('routers', {
	id: int().primaryKey({ autoIncrement: true }),
	displayName: text().notNull().unique(),
	routerIP: text().notNull().unique(),
	username: text().notNull(),
	password: text().notNull(),
	session: text().notNull(),
	lastAccessed: int().notNull().default(0),
	isPrimary: int().notNull().default(0)
});

export const clientsTable = sqliteTable(
	'clients',
	{
		id: int().primaryKey({ autoIncrement: true }),
		clientName: text().notNull(),
		clientMacAddress: text().notNull()
	},
	(table) => [unique().on(table.clientMacAddress)]
);

export const wifisTable = sqliteTable(
	'wifis',
	{
		id: int().primaryKey({ autoIncrement: true }),
		displayName: text().notNull(),
		ssid: text().notNull(),
		band: text().notNull()
	},
	(table) => [unique().on(table.displayName, table.ssid, table.band)]
);

export const presencesEventTable = sqliteTable('presences_event', {
	id: int().primaryKey({ autoIncrement: true }),
	timestamp: int().notNull(),
	clientId: int()
		.notNull()
		.references(() => clientsTable.id),
	event: text().notNull(),
	fromWifiId: int().references(() => wifisTable.id),
	toWifiId: int().references(() => wifisTable.id)
});

export const presencesRelations = relations(presencesEventTable, ({ one }) => ({
	client: one(clientsTable, {
		fields: [presencesEventTable.clientId],
		references: [clientsTable.id]
	}),
	fromWifi: one(wifisTable, {
		fields: [presencesEventTable.fromWifiId],
		references: [wifisTable.id]
	}),
	toWifi: one(wifisTable, {
		fields: [presencesEventTable.toWifiId],
		references: [wifisTable.id]
	})
}));

export const prevClientsTable = sqliteTable('prev_clients', {
	id: int().primaryKey({ autoIncrement: true }),
	data: text().notNull()
});

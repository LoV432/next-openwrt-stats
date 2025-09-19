import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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

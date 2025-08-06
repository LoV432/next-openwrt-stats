import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const routersTable = sqliteTable('routers', {
	id: int().primaryKey({ autoIncrement: true }),
	routerIP: text().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	session: text().notNull(),
	isPrimary: int().notNull().default(0)
});

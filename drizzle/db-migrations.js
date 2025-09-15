import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';

const db = drizzle(
	createClient({
		url: 'file:./db/local.db',
		dialect: 'sqlite'
	})
);

await migrate(db, {
	migrationsFolder: './migrations',
	migrationsSchema: './schema/schema.ts'
});

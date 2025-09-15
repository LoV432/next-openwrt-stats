import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	out: './drizzle/migrations',
	schema: './drizzle/schema/schema.ts',
	dialect: 'sqlite',
	dbCredentials: {
		url: 'file:./drizzle/db/local.db'
	}
});

import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

dotenv.config({ path: '.env.local' }).parsed;

export default defineConfig({
	out: './drizzle',
	schema: './db/schema.ts',
	dialect: 'sqlite',
	dbCredentials: {
		url: process.env.DB_FILE_NAME!
	}
});

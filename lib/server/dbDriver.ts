import 'server-only';
import { drizzle } from 'drizzle-orm/libsql';

export const db = drizzle('file:./drizzle/db/local.db');

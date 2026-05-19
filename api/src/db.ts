import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.ts';
import './env.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

export const sql = postgres(url, { max: 5 });
export const db = drizzle(sql, { schema });

import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.js'
import * as cashflowSchema from './cashflowSchema.js'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
})

export const db = drizzle(pool, { schema: { ...schema, ...cashflowSchema } })
export { pool }

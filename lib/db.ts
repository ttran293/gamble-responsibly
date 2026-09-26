import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.TIMESCALE_SERVICE_URL;

if (!connectionString) {
  throw new Error("TIMESCALE_SERVICE_URL must be configured before using the database.");
}

const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool = globalForDb.pool ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle({ client: pool });

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema/schema";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DB_URL,
});

export const db = drizzle(pool, {
  schema,
});
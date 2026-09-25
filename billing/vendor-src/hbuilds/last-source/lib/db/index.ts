import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

/* MySQL port. Was @neondatabase/serverless (drizzle-orm/neon-http).

   mysql2 is a pooled, persistent connection rather than Neon's per-query HTTP
   fetch, so the pool is created once and reused for the life of the server
   process — the same lazy-singleton shape as before.

   DATABASE_URL is now a MySQL URI, e.g.
     mysql://USER:PASSWORD@localhost:3306/DBNAME
   On Hostinger the Node app and MySQL share a host, so `localhost` is correct
   and the traffic never leaves the server. */

let _db: MySql2Database<typeof schema> | null = null;

export function db(): MySql2Database<typeof schema> {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. Add it to .env (local) or your host's environment settings.");
    const pool = mysql.createPool({
      uri: url,
      waitForConnections: true,
      connectionLimit: 10,
      // Hostinger MySQL closes idle connections; keep the pool honest.
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      // Store JSON columns as objects, matching what jsonb did under Postgres.
      timezone: "Z",
    });
    _db = drizzle(pool, { schema, mode: "default" });
  }
  return _db;
}

export * from "./schema";

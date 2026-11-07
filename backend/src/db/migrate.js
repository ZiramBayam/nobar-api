import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { env } from '../config/env.js';

const migrationsDir = fileURLToPath(new URL('../../migrations', import.meta.url));

// Migrasi memakai koneksi langsung (unpooled) karena DDL/transaksi tidak
// cocok lewat PgBouncer transaction mode milik koneksi pooled Neon.
const url = new URL(env.DATABASE_URL_UNPOOLED || env.DATABASE_URL);
url.searchParams.set('sslmode', 'verify-full');

const client = new pg.Client({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true },
});

async function main() {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const { rows } = await client.query('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.filename));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip ${file}`);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`applied ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => client.end().catch(() => {}));

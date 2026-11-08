import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const backendDir = fileURLToPath(new URL('..', import.meta.url));

dotenv.config({ path: path.join(backendDir, '.env'), quiet: true });

// Pengaman utama: test tidak boleh menyentuh database produksi. Dibandingkan
// sebelum DATABASE_URL ditimpa, karena proses test memang menimpa nilainya.
function getTestDatabaseUrl() {
  const testUrl = process.env.TEST_DATABASE_URL?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!testUrl) {
    throw new Error(
      'TEST_DATABASE_URL kosong. Isi dengan connection string database khusus test.',
    );
  }

  if (testUrl === databaseUrl) {
    throw new Error(
      'TEST_DATABASE_URL sama dengan DATABASE_URL. Test dibatalkan agar database produksi tidak tersentuh.',
    );
  }

  return testUrl;
}

async function deleteTestUsers(testUrl) {
  // Samakan mode SSL dengan pool aplikasi agar tidak ada warning/perbedaan
  // semantik antara koneksi setup dan koneksi test.
  const url = new URL(testUrl);
  url.searchParams.set('sslmode', 'verify-full');

  const client = new pg.Client({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: true },
  });

  await client.connect();
  try {
    // Targeted DELETE: hanya sisa user test dari run sebelumnya.
    await client.query("DELETE FROM users WHERE email LIKE 'vitest-%@example.com'");
  } finally {
    await client.end();
  }
}

export default async function globalSetup() {
  const testUrl = getTestDatabaseUrl();
  const testEnv = {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: testUrl,
    DATABASE_URL_UNPOOLED: testUrl,
    BCRYPT_ROUNDS: '4',
  };

  // Migrasi dulu supaya tabel users ada, baru bersihkan sisa user test.
  execFileSync(process.execPath, ['src/db/migrate.js'], {
    cwd: backendDir,
    env: testEnv,
    stdio: 'inherit',
  });

  await deleteTestUsers(testUrl);

  // Seed idempotent; aman dijalankan setiap kali test dimulai.
  execFileSync(process.execPath, ['src/db/seed.js'], {
    cwd: backendDir,
    env: testEnv,
    stdio: 'inherit',
  });
}

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { afterAll } from 'vitest';

const backendDir = fileURLToPath(new URL('..', import.meta.url));

dotenv.config({ path: path.join(backendDir, '.env'), quiet: true });

const testUrl = process.env.TEST_DATABASE_URL?.trim();
const databaseUrl = process.env.DATABASE_URL?.trim();

// Ulangi pengaman di sini: file setup berjalan di proses worker yang berbeda
// dari global setup, jadi pengecekan tidak boleh hanya bergantung pada satu tempat.
if (!testUrl) {
  throw new Error('TEST_DATABASE_URL kosong. Test dibatalkan.');
}

if (testUrl === databaseUrl) {
  throw new Error(
    'TEST_DATABASE_URL sama dengan DATABASE_URL. Test dibatalkan agar database produksi tidak tersentuh.',
  );
}

// Timpa SEBELUM modul aplikasi diimpor (test file dievaluasi setelah setup).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testUrl;
process.env.DATABASE_URL_UNPOOLED = testUrl;
// bcrypt cost rendah khusus test: hash asli tetap dipakai, hanya lebih cepat.
process.env.BCRYPT_ROUNDS = '4';
// Rate limit rekomendasi tidak boleh mengganggu rangkaian test.
process.env.RECOMMEND_RATE_LIMIT_PER_MIN = '1000';
// Gemini selalu di-mock; kosongkan key agar tidak ada jalan ke API asli.
process.env.GEMINI_API_KEY = '';
process.env.GEMINI_MODEL = '';

afterAll(async () => {
  // Dynamic import: pool harus dibuat setelah env di atas ditimpa.
  const { pool } = await import('../src/db/pool.js');
  await pool.query("DELETE FROM users WHERE email LIKE 'vitest-%@example.com'");
  await pool.end();
});

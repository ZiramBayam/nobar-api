import pg from 'pg';
import { env } from '../config/env.js';

// pg mengembalikan NUMERIC sebagai string; rating film harus number di JSON.
pg.types.setTypeParser(1700, (value) => parseFloat(value));

// Tulis mode SSL secara eksplisit: `require` masih diperlakukan sebagai
// verify-full sekarang, tetapi semantiknya berubah di pg 9. Neon memakai
// sertifikat publik, jadi verifikasi penuh memang yang kita mau.
const url = new URL(env.DATABASE_URL);
url.searchParams.set('sslmode', 'verify-full');

export const pool = new pg.Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true },
  max: 10,
});

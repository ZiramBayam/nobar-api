import { pool } from '../db/pool.js';

// password_hash hanya diambil untuk login; service tidak pernah mengembalikan
// kolom ini ke client.
export async function findByEmail(email) {
  const { rows } = await pool.query(
    'SELECT id, username, email, password_hash FROM users WHERE email = $1',
    [email],
  );

  return rows[0] ?? null;
}

export async function create({ username, email, passwordHash }) {
  const { rows } = await pool.query(
    `INSERT INTO users (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, username, email`,
    [username, email, passwordHash],
  );

  return rows[0];
}

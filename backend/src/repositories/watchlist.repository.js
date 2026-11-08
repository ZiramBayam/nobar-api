import { pool } from '../db/pool.js';

// movie_id DESC hanya tie-breaker agar urutan deterministik saat dua entri
// dibuat pada timestamp yang sama.
export async function findAllByUser(userId) {
  const { rows } = await pool.query(
    `SELECT movie_id, created_at
     FROM watchlist
     WHERE user_id = $1
     ORDER BY created_at DESC, movie_id DESC`,
    [userId],
  );

  return rows;
}

// Duplikat dan film tidak ada sengaja dibiarkan menjadi error PostgreSQL:
// constraint yang memutuskan, lalu error handler pusat menerjemahkannya.
export async function add(userId, movieId) {
  const { rows } = await pool.query(
    `INSERT INTO watchlist (user_id, movie_id)
     VALUES ($1, $2)
     RETURNING movie_id, created_at`,
    [userId, movieId],
  );

  return rows[0];
}

export async function remove(userId, movieId) {
  const { rowCount } = await pool.query(
    'DELETE FROM watchlist WHERE user_id = $1 AND movie_id = $2',
    [userId, movieId],
  );

  return rowCount > 0;
}

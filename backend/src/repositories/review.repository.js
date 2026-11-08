import { pool } from '../db/pool.js';

export async function findAllByUser(userId) {
  const { rows } = await pool.query(
    `SELECT id, movie_id, rating, review, created_at, updated_at
     FROM reviews
     WHERE user_id = $1
     ORDER BY updated_at DESC, id DESC`,
    [userId],
  );

  return rows;
}

// Upsert: satu ulasan per (user, film). `created_at` sengaja tidak disentuh
// saat update; hanya `updated_at` yang maju.
// `(xmax = 0)` menandai baris hasil INSERT (true) versus UPDATE (false).
// Trik ini khusus PostgreSQL dan dipakai supaya route bisa memilih 201/200
// tanpa query tambahan.
export async function upsert(userId, movieId, rating, review) {
  const { rows } = await pool.query(
    `INSERT INTO reviews (user_id, movie_id, rating, review)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, movie_id) DO UPDATE
       SET rating = EXCLUDED.rating,
           review = EXCLUDED.review,
           updated_at = now()
     RETURNING id, movie_id, rating, review, created_at, updated_at,
               (xmax = 0) AS inserted`,
    [userId, movieId, rating, review],
  );

  return rows[0];
}

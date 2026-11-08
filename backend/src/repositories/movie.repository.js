import { pool } from '../db/pool.js';

// Dipakai bersama oleh list dan detail supaya bentuk Movie selalu sama.
const MOVIE_SELECT = `
  SELECT m.id, m.title, m.year, m.director, m.rating, m.duration, m.synopsis, m.poster_url,
         m.cast_members AS "cast",
         COALESCE(array_agg(g.name ORDER BY g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS genres
  FROM movies m
  LEFT JOIN movie_genres mg ON mg.movie_id = m.id
  LEFT JOIN genres g ON g.id = mg.genre_id
`;

// ILIKE memperlakukan % dan _ sebagai wildcard; input user harus di-escape
// supaya `search=%` tidak mencocokkan semua film.
function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

export async function findAll({ genre, search, shuffle } = {}) {
  const conditions = [];
  const params = [];

  if (genre) {
    params.push(genre);
    // EXISTS memfilter film tanpa memotong array genres hasil LEFT JOIN.
    conditions.push(`EXISTS (
      SELECT 1 FROM movie_genres x JOIN genres gg ON gg.id = x.genre_id
      WHERE x.movie_id = m.id AND lower(gg.name) = lower($${params.length})
    )`);
  }

  if (search) {
    params.push(`%${escapeLike(search)}%`);
    conditions.push(`(m.title ILIKE $${params.length} OR m.director ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const order = shuffle ? 'ORDER BY random()' : 'ORDER BY m.id';

  const { rows } = await pool.query(
    `${MOVIE_SELECT} ${where} GROUP BY m.id ${order}`,
    params,
  );

  return rows;
}

export async function findById(id) {
  const { rows } = await pool.query(
    `${MOVIE_SELECT} WHERE m.id = $1 GROUP BY m.id`,
    [id],
  );

  return rows[0] ?? null;
}

// Dipakai watchlist/review agar daftar tidak memicu satu query per film.
// Array kosong harus berhenti di sini: `= ANY('{}')` valid, tetapi tidak perlu
// membangunkan DB untuk hasil yang pasti kosong.
export async function findByIds(ids) {
  if (ids.length === 0) return [];

  const { rows } = await pool.query(
    `${MOVIE_SELECT} WHERE m.id = ANY($1) GROUP BY m.id`,
    [ids],
  );

  return rows;
}

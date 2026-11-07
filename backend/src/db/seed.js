import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { env } from '../config/env.js';

const seedFile = fileURLToPath(new URL('../../seed-data/movies.json', import.meta.url));

// Sama seperti migrasi: seed memakai koneksi langsung (unpooled) karena
// menjalankan satu transaksi panjang lewat PgBouncer transaction mode berisiko.
const url = new URL(env.DATABASE_URL_UNPOOLED || env.DATABASE_URL);
url.searchParams.set('sslmode', 'verify-full');

const client = new pg.Client({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: true },
});

async function main() {
  const movies = JSON.parse(await fs.readFile(seedFile, 'utf8'));

  await client.connect();
  // Satu transaksi: kalau satu film gagal, katalog tidak tertinggal setengah jadi.
  await client.query('BEGIN');

  try {
    for (const movie of movies) {
      await client.query(
        `INSERT INTO movies (id, title, year, director, rating, duration, synopsis, poster_url, cast_members)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           title        = EXCLUDED.title,
           year         = EXCLUDED.year,
           director     = EXCLUDED.director,
           rating       = EXCLUDED.rating,
           duration     = EXCLUDED.duration,
           synopsis     = EXCLUDED.synopsis,
           poster_url   = EXCLUDED.poster_url,
           cast_members = EXCLUDED.cast_members`,
        [
          movie.id,
          movie.title,
          movie.year,
          movie.director,
          movie.rating,
          movie.duration,
          movie.synopsis,
          movie.poster_url,
          movie.cast,
        ],
      );

      // Genre bisa berubah antar-seed; hapus relasi lama agar tidak ada sisa.
      await client.query('DELETE FROM movie_genres WHERE movie_id = $1', [movie.id]);

      for (const genre of movie.genres) {
        await client.query(
          'INSERT INTO genres (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
          [genre],
        );
        await client.query(
          `INSERT INTO movie_genres (movie_id, genre_id)
           SELECT $1, id FROM genres WHERE name = $2`,
          [movie.id, genre],
        );
      }
    }

    // Id diisi manual, jadi identity sequence tidak ikut maju. Tanpa setval,
    // insert film baru akan mencoba id 1 dan bentrok dengan data seed.
    await client.query(
      `SELECT setval(pg_get_serial_sequence('movies', 'id'), (SELECT MAX(id) FROM movies))`,
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }

  const { rows } = await client.query(`
    SELECT
      (SELECT count(*) FROM movies)::int       AS movies,
      (SELECT count(*) FROM genres)::int       AS genres,
      (SELECT count(*) FROM movie_genres)::int AS movie_genres
  `);
  const { movies: movieCount, genres, movie_genres: relationCount } = rows[0];
  console.log(`seed selesai: ${movieCount} film, ${genres} genre, ${relationCount} relasi`);
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => client.end().catch(() => {}));

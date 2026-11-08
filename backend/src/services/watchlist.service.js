import { HttpError } from '../lib/httpError.js';
import * as movieRepository from '../repositories/movie.repository.js';
import * as watchlistRepository from '../repositories/watchlist.repository.js';

// Ambil semua baris dulu, lalu filmnya sekaligus dengan satu query; hindari
// N+1 query per item watchlist.
async function attachMovies(rows) {
  const movies = await movieRepository.findByIds(rows.map((row) => row.movie_id));
  const byId = new Map(movies.map((movie) => [movie.id, movie]));

  return rows.map((row) => ({ ...row, movie: byId.get(row.movie_id) }));
}

export async function listWatchlist(userId) {
  const rows = await watchlistRepository.findAllByUser(userId);
  return attachMovies(rows);
}

export async function addToWatchlist(userId, movieId) {
  const row = await watchlistRepository.add(userId, movieId);
  const movie = await movieRepository.findById(movieId);

  return { ...row, movie };
}

export async function removeFromWatchlist(userId, movieId) {
  const removed = await watchlistRepository.remove(userId, movieId);

  // rowCount 0 berarti entri itu tidak ada MILIK USER INI; tidak perlu
  // membedakan "tidak ada" dan "milik orang lain" karena 403 memang tidak
  // dipakai (query selalu di-scope ke user_id dari token).
  if (!removed) throw new HttpError(404, 'Film tidak ada di watchlist');
}

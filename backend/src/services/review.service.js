import * as movieRepository from '../repositories/movie.repository.js';
import * as reviewRepository from '../repositories/review.repository.js';

async function attachMovies(rows) {
  const movies = await movieRepository.findByIds(rows.map((row) => row.movie_id));
  const byId = new Map(movies.map((movie) => [movie.id, movie]));

  return rows.map((row) => ({ ...row, movie: byId.get(row.movie_id) }));
}

export async function listWatched(userId) {
  const rows = await reviewRepository.findAllByUser(userId);
  return attachMovies(rows);
}

// `inserted` dipisahkan dari bentuk ReviewItem supaya route bisa memilih
// status 201/200 tanpa membocorkan flag internal ke response body.
export async function saveReview(userId, { movieId, rating, review }) {
  const { inserted, ...row } = await reviewRepository.upsert(userId, movieId, rating, review);
  const movie = await movieRepository.findById(movieId);

  return { inserted, item: { ...row, movie } };
}

import { HttpError } from '../lib/httpError.js';
import * as movieRepository from '../repositories/movie.repository.js';

export function listMovies(query) {
  return movieRepository.findAll(query);
}

export async function getMovieById(id) {
  const movie = await movieRepository.findById(id);

  if (!movie) throw new HttpError(404, 'Film tidak ditemukan');

  return movie;
}

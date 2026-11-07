import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { movieIdParamSchema, movieListQuerySchema } from '../schemas/movie.schema.js';
import * as movieService from '../services/movie.service.js';

export const moviesRouter = Router();

moviesRouter.get('/', validate({ query: movieListQuerySchema }), async (req, res) => {
  const movies = await movieService.listMovies(req.validated.query);
  res.json(movies);
});

// Route statis seperti /recommend nanti harus didaftarkan sebelum /:id.
moviesRouter.get('/:id', validate({ params: movieIdParamSchema }), async (req, res) => {
  const movie = await movieService.getMovieById(req.validated.params.id);
  res.json(movie);
});

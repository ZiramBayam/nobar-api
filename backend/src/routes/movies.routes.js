import { Router } from 'express';
import { recommendLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { movieIdParamSchema, movieListQuerySchema } from '../schemas/movie.schema.js';
import { recommendBodySchema } from '../schemas/recommendation.schema.js';
import * as movieService from '../services/movie.service.js';
import * as recommendationService from '../services/recommendation.service.js';

export const moviesRouter = Router();

moviesRouter.get('/', validate({ query: movieListQuerySchema }), async (req, res) => {
  const movies = await movieService.listMovies(req.validated.query);
  res.json(movies);
});

// Endpoint publik (tanpa auth) tetapi di-rate-limit karena memanggil Gemini.
moviesRouter.post(
  '/recommend',
  recommendLimiter,
  validate({ body: recommendBodySchema }),
  async (req, res) => {
    const result = await recommendationService.recommend(req.validated.body.prompt);
    res.json(result);
  },
);

// Route statis seperti /recommend didaftarkan sebelum /:id.
moviesRouter.get('/:id', validate({ params: movieIdParamSchema }), async (req, res) => {
  const movie = await movieService.getMovieById(req.validated.params.id);
  res.json(movie);
});

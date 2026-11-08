import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { watchlistBodySchema, watchlistParamSchema } from '../schemas/watchlist.schema.js';
import * as watchlistService from '../services/watchlist.service.js';

export const watchlistRouter = Router();

// Dipasang di router, bukan global: endpoint publik tetap menerima token basi.
watchlistRouter.use(requireAuth);

watchlistRouter.get('/', async (req, res) => {
  const items = await watchlistService.listWatchlist(req.user.id);
  res.json(items);
});

watchlistRouter.post('/', validate({ body: watchlistBodySchema }), async (req, res) => {
  const item = await watchlistService.addToWatchlist(req.user.id, req.validated.body.movieId);
  res.status(201).json(item);
});

watchlistRouter.delete('/:movieId', validate({ params: watchlistParamSchema }), async (req, res) => {
  await watchlistService.removeFromWatchlist(req.user.id, req.validated.params.movieId);
  res.status(204).end();
});

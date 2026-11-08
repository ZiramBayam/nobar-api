import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reviewBodySchema } from '../schemas/review.schema.js';
import * as reviewService from '../services/review.service.js';

export const watchedRouter = Router();

watchedRouter.use(requireAuth);

watchedRouter.get('/', async (req, res) => {
  const items = await reviewService.listWatched(req.user.id);
  res.json(items);
});

watchedRouter.post('/', validate({ body: reviewBodySchema }), async (req, res) => {
  const { inserted, item } = await reviewService.saveReview(req.user.id, req.validated.body);
  res.status(inserted ? 201 : 200).json(item);
});

import { Router } from 'express';
import { moviesRouter } from './movies.routes.js';

export const apiRouter = Router();

apiRouter.use('/movies', moviesRouter);

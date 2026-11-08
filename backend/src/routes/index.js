import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { moviesRouter } from './movies.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/movies', moviesRouter);

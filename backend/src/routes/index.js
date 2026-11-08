import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { moviesRouter } from './movies.routes.js';
import { watchedRouter } from './watched.routes.js';
import { watchlistRouter } from './watchlist.routes.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/movies', moviesRouter);
apiRouter.use('/watchlist', watchlistRouter);
apiRouter.use('/watched', watchedRouter);

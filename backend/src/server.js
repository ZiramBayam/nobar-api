import { createApp } from './app.js';
import { env } from './config/env.js';

if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL) {
  console.warn(
    'GEMINI_API_KEY/GEMINI_MODEL kosong: POST /api/movies/recommend akan membalas 503',
  );
}

const app = createApp();

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`FilmLog API listening on http://0.0.0.0:${env.PORT}`);
});

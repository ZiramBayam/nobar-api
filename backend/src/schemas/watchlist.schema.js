import { z } from 'zod';

// Parameter URL selalu string, jadi perlu coerce. Body tidak di-coerce supaya
// nilai aneh seperti `true` tidak diam-diam berubah menjadi angka 1.
const movieIdParam = z.coerce
  .number({ error: 'ID film harus bilangan bulat positif' })
  .int({ error: 'ID film harus bilangan bulat positif' })
  .positive({ error: 'ID film harus bilangan bulat positif' });

export const watchlistBodySchema = z.object({
  movieId: z
    .number({ error: 'ID film harus bilangan bulat positif' })
    .int({ error: 'ID film harus bilangan bulat positif' })
    .positive({ error: 'ID film harus bilangan bulat positif' }),
});

export const watchlistParamSchema = z.object({ movieId: movieIdParam });

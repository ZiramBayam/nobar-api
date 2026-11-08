import { z } from 'zod';

export const reviewBodySchema = z.object({
  movieId: z
    .number({ error: 'ID film harus bilangan bulat positif' })
    .int({ error: 'ID film harus bilangan bulat positif' })
    .positive({ error: 'ID film harus bilangan bulat positif' }),
  // Rating disimpan SMALLINT 1-5; 4.5 ditolak di sini, bukan dibulatkan
  // diam-diam oleh DB.
  rating: z
    .number({ error: 'Rating harus bilangan bulat 1-5' })
    .int({ error: 'Rating harus bilangan bulat 1-5' })
    .min(1, { error: 'Rating harus bilangan bulat 1-5' })
    .max(5, { error: 'Rating harus bilangan bulat 1-5' }),
  review: z
    .string({ error: 'Review wajib diisi' })
    .trim()
    .min(1, { error: 'Review wajib diisi' })
    .max(2000, { error: 'Review maksimal 2000 karakter' }),
});

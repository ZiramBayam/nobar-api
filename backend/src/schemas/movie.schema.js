import { z } from 'zod';

const movieId = z.coerce
  .number({ error: 'ID film harus bilangan bulat positif' })
  .int({ error: 'ID film harus bilangan bulat positif' })
  .positive({ error: 'ID film harus bilangan bulat positif' });

export const movieIdParamSchema = z.object({ id: movieId });

// Field yang tidak dikenal diabaikan (bukan ditolak), sesuai perilaku frontend
// yang kadang mengirim alias field.
export const movieListQuerySchema = z.object({
  genre: z.string({ error: 'Genre harus berupa teks' }).trim().optional(),
  search: z.string({ error: 'Pencarian harus berupa teks' }).trim().optional(),
  shuffle: z.literal('true', { error: 'Shuffle hanya menerima nilai true' }).optional(),
});

import { z } from 'zod';

// Frontend juga mengirim `query` dan `description`; keduanya diabaikan karena
// hanya `prompt` yang menjadi kontrak.
export const recommendBodySchema = z.object({
  prompt: z
    .string({ error: 'Prompt wajib diisi' })
    .trim()
    .min(1, { error: 'Prompt wajib diisi' })
    .max(500, { error: 'Prompt maksimal 500 karakter' }),
});

import { z } from 'zod';

// Email disimpan huruf kecil agar UNIQUE di DB konsisten dan pencarian login
// tidak bergantung pada kapitalisasi yang dikirim user.
const email = z
  .string({ error: 'Email wajib diisi' })
  .trim()
  .toLowerCase()
  .email({ error: 'Format email tidak valid' })
  .max(255, { error: 'Email maksimal 255 karakter' });

const username = z
  .string({ error: 'Username wajib diisi' })
  .trim()
  .min(1, { error: 'Username wajib diisi' })
  .max(50, { error: 'Username maksimal 50 karakter' });

// bcrypt hanya membaca 72 byte pertama; batas ini mencegah password panjang
// diam-diam terpotong dan membuat perilaku hash tidak mengejutkan.
const withinBcryptLimit = (value) => Buffer.byteLength(value, 'utf8') <= 72;

const password = z
  .string({ error: 'Password wajib diisi' })
  .min(8, { error: 'Password minimal 8 karakter' })
  .refine(withinBcryptLimit, { error: 'Password maksimal 72 byte' });

export const registerSchema = z.object({ username, email, password });

export const loginSchema = z.object({
  email,
  password: z
    .string({ error: 'Password wajib diisi' })
    .min(1, { error: 'Password wajib diisi' })
    .refine(withinBcryptLimit, { error: 'Password maksimal 72 byte' }),
});

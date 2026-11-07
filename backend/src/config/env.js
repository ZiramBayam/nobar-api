import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Baca backend/.env berdasarkan lokasi file ini, bukan cwd, supaya
// `npm run` dari folder mana pun tetap memakai konfigurasi yang sama.
dotenv.config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  quiet: true,
});

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL wajib diisi'),
  DATABASE_URL_UNPOOLED: z.string().optional().default(''),
  TEST_DATABASE_URL: z.string().optional().default(''),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().optional().default(''),
  CORS_ORIGIN: z.string().default('*'),
  RECOMMEND_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(10),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Konfigurasi environment tidak valid:');
  for (const issue of parsed.error.issues) {
    console.error(`- ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

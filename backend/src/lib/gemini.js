import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

const TIMEOUT_MS = 15000;
let client;

// Klien dibuat lazy: server tetap boot tanpa GEMINI_API_KEY, dan endpoint lain
// tidak perlu menyentuh SDK. Model juga wajib diisi karena nama model berubah
// dari waktu ke waktu dan sengaja tidak di-hardcode.
function getClient() {
  if (!env.GEMINI_API_KEY || !env.GEMINI_MODEL) return null;
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  return client;
}

export function isConfigured() {
  return Boolean(env.GEMINI_API_KEY && env.GEMINI_MODEL);
}

// Pembungkus tipis supaya service tidak bergantung pada bentuk SDK dan mudah
// di-mock di test. Mengembalikan teks mentah; validasi JSON tetap di service.
export async function generateJson({ systemInstruction, contents, responseJsonSchema }) {
  const ai = getClient();
  if (!ai) throw new Error('Gemini belum dikonfigurasi');

  const response = await ai.models.generateContent({
    model: env.GEMINI_MODEL,
    contents,
    config: {
      systemInstruction,
      // Temperature rendah: rekomendasi harus konsisten, bukan kreatif.
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseJsonSchema,
      // Batas waktu supaya request tidak menggantung; SDK membatalkan
      // panggilan lewat AbortSignal.
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    },
  });

  return response.text;
}

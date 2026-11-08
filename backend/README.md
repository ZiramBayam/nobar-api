# FilmLog Backend

API FilmLog: Express 5 + PostgreSQL (SQL mentah, tanpa ORM).

## Prasyarat

- Node.js 22 atau lebih baru
- Database PostgreSQL (Neon) dan database terpisah untuk test

## Setup

```bash
cd backend
npm install
cp .env.example .env   # isi nilainya, jangan commit .env
npm run migrate
npm run seed
npm run dev            # http://localhost:8000
```

Variabel environment yang dipakai ada di [`.env.example`](./.env.example).
`DATABASE_URL` untuk aplikasi, `TEST_DATABASE_URL` untuk test (wajib berbeda).

## Script

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server dengan watch mode |
| `npm start` | Server biasa |
| `npm run migrate` | Jalankan migrasi SQL yang belum diterapkan |
| `npm run seed` | Isi/segarkan 20 film dari `seed-data/movies.json` |
| `npm run start:prod` | Migrasi + seed + start (dipakai Railway) |
| `npm test` | Vitest + supertest terhadap database test |
| `npm run build` | Cek sintaks seluruh file di `src/` |

## Test

Test memakai `TEST_DATABASE_URL` dan **menolak berjalan** jika variabel itu kosong
atau sama dengan `DATABASE_URL`. Gemini selalu di-mock, jadi test tidak memanggil
API asli dan tidak membutuhkan `GEMINI_API_KEY`.

```bash
npm test
```

## Endpoint

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | publik |
| POST | `/api/auth/register` | publik |
| POST | `/api/auth/login` | publik |
| GET | `/api/movies` | publik |
| GET | `/api/movies/:id` | publik |
| POST | `/api/movies/recommend` | publik (rate limit) |
| GET/POST | `/api/watchlist` | Bearer JWT |
| DELETE | `/api/watchlist/:movieId` | Bearer JWT |
| GET/POST | `/api/watched` | Bearer JWT |

Dokumentasi kontrak lengkap: [`openapi.yaml`](./openapi.yaml) (OpenAPI 3.1; bisa
dibuka di Swagger Editor atau diimpor ke Postman).

## Deploy

Railway menjalankan `npm run start:prod` dengan healthcheck `/health`.
Migrasi dan seed idempotent, jadi aman dijalankan setiap deploy. Request pertama
setelah idle bisa lambat karena Neon bangun dari mode idle; ini normal.

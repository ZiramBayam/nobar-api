import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './helpers.js';

describe('GET /api/movies', () => {
  it('mengembalikan 20 film berurutan id ASC', async () => {
    const res = await request(app).get('/api/movies');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(20);
    expect(res.body.map((movie) => movie.id)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );

    const first = res.body[0];
    expect(first).toMatchObject({
      id: 1,
      title: expect.any(String),
      year: expect.any(Number),
      director: expect.any(String),
      rating: expect.any(Number),
      genres: expect.any(Array),
    });
    expect(first).not.toHaveProperty('password_hash');
  });

  it('memfilter genre tanpa peduli kapitalisasi', async () => {
    const res = await request(app).get('/api/movies').query({ genre: 'SCI-FI' });

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const movie of res.body) {
      expect(movie.genres.map((genre) => genre.toLowerCase())).toContain('sci-fi');
    }
  });

  it('mencari judul atau sutradara dengan ILIKE', async () => {
    const res = await request(app).get('/api/movies').query({ search: 'nolan' });

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const movie of res.body) {
      expect(movie.director.toLowerCase()).toContain('nolan');
    }
  });

  it('mengembalikan array kosong bila tidak ada yang cocok, bukan 404', async () => {
    const res = await request(app).get('/api/movies').query({ search: 'judul-yang-tidak-ada' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('mengacak urutan dengan shuffle=true tanpa mengubah jumlah', async () => {
    const res = await request(app).get('/api/movies').query({ shuffle: 'true' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(20);
    expect(new Set(res.body.map((movie) => movie.id)).size).toBe(20);
  });

  it('menolak nilai shuffle selain true dengan 400', async () => {
    const res = await request(app).get('/api/movies').query({ shuffle: 'false' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Shuffle hanya menerima nilai true');
  });
});

describe('GET /api/movies/:id', () => {
  it('mengembalikan satu film dengan rating berupa number', async () => {
    const res = await request(app).get('/api/movies/1');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(typeof res.body.rating).toBe('number');
    expect(res.body.genres.length).toBeGreaterThan(0);
  });

  it('menolak id tidak valid dengan 400 dan id tidak ada dengan 404', async () => {
    const invalid = await request(app).get('/api/movies/abc');
    const missing = await request(app).get('/api/movies/999');

    expect(invalid.status).toBe(400);
    expect(invalid.body.message).toBe('ID film harus bilangan bulat positif');
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ message: 'Film tidak ditemukan' });
  });
});

describe('Rute tidak dikenal', () => {
  it('mengembalikan 404 berformat { message }', async () => {
    const res = await request(app).get('/api/tidak-ada');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Endpoint tidak ditemukan' });
  });
});

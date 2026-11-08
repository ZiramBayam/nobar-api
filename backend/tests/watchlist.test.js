import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, registerAndLogin } from './helpers.js';
import { pool } from '../src/db/pool.js';

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('Watchlist', () => {
  it('menolak request tanpa token', async () => {
    const res = await request(app).get('/api/watchlist');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Token tidak ditemukan' });
  });

  it('menambah film, menolak duplikat, dan menolak film yang tidak ada', async () => {
    const { token } = await registerAndLogin('watch-add');

    const created = await request(app)
      .post('/api/watchlist')
      .set(auth(token))
      .send({ movieId: 1 });

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      movie_id: 1,
      movie: { id: 1, title: expect.any(String) },
    });

    const duplicate = await request(app)
      .post('/api/watchlist')
      .set(auth(token))
      .send({ movieId: 1 });
    const missing = await request(app)
      .post('/api/watchlist')
      .set(auth(token))
      .send({ movieId: 999 });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({ message: 'Film sudah ada di watchlist' });
    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ message: 'Film tidak ditemukan' });
  });

  it('menolak body yang tidak valid dengan 400', async () => {
    const { token } = await registerAndLogin('watch-invalid');

    for (const body of [{}, { movieId: 'x' }, { movieId: 0 }, { movieId: 1.5 }]) {
      const res = await request(app).post('/api/watchlist').set(auth(token)).send(body);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('ID film harus bilangan bulat positif');
    }
  });

  it('mengurutkan daftar dari yang terbaru dan menyertakan objek movie', async () => {
    const { token } = await registerAndLogin('watch-list');

    await request(app).post('/api/watchlist').set(auth(token)).send({ movieId: 1 }).expect(201);
    await request(app).post('/api/watchlist').set(auth(token)).send({ movieId: 2 }).expect(201);

    const res = await request(app).get('/api/watchlist').set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.map((item) => item.movie_id)).toEqual([2, 1]);
    for (const item of res.body) {
      expect(item.movie).toMatchObject({ id: item.movie_id });
    }
  });

  it('mengisolasi data antar user dan tidak memakai 403', async () => {
    const userA = await registerAndLogin('watch-a');
    const userB = await registerAndLogin('watch-b');

    await request(app)
      .post('/api/watchlist')
      .set(auth(userA.token))
      .send({ movieId: 1 })
      .expect(201);

    const listB = await request(app).get('/api/watchlist').set(auth(userB.token));
    const deleteByB = await request(app).delete('/api/watchlist/1').set(auth(userB.token));
    const listA = await request(app).get('/api/watchlist').set(auth(userA.token));

    expect(listB.status).toBe(200);
    expect(listB.body).toEqual([]);
    expect(deleteByB.status).toBe(404);
    expect(deleteByB.body).toEqual({ message: 'Film tidak ada di watchlist' });
    expect(listA.body.map((item) => item.movie_id)).toEqual([1]);
  });

  it('menghapus entri dengan 204 lalu 404, dan menolak id tidak valid', async () => {
    const { token } = await registerAndLogin('watch-delete');
    await request(app).post('/api/watchlist').set(auth(token)).send({ movieId: 3 }).expect(201);

    const removed = await request(app).delete('/api/watchlist/3').set(auth(token));
    const again = await request(app).delete('/api/watchlist/3').set(auth(token));
    const invalid = await request(app).delete('/api/watchlist/abc').set(auth(token));

    expect(removed.status).toBe(204);
    expect(removed.text).toBe('');
    expect(again.status).toBe(404);
    expect(invalid.status).toBe(400);
    expect(invalid.body.message).toBe('ID film harus bilangan bulat positif');
  });

  it('menolak token milik user yang sudah dihapus dengan 401', async () => {
    const { token, userId } = await registerAndLogin('watch-deleted');

    // Targeted DELETE, bukan TRUNCATE: hanya user test ini.
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    const res = await request(app)
      .post('/api/watchlist')
      .set(auth(token))
      .send({ movieId: 1 });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Sesi berakhir, silakan login lagi' });
  });
});

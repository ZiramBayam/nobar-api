import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, registerAndLogin } from './helpers.js';

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('Watched & Review', () => {
  it('menolak request tanpa token', async () => {
    const res = await request(app).get('/api/watched');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Token tidak ditemukan' });
  });

  it('membuat review baru dengan 201 dan objek movie bersarang', async () => {
    const { token } = await registerAndLogin('watched-create');

    const res = await request(app)
      .post('/api/watched')
      .set(auth(token))
      .send({ movieId: 1, rating: 5, review: '  Mantap  ' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      movie_id: 1,
      rating: 5,
      review: 'Mantap',
      movie: { id: 1 },
    });
    expect(res.body.id).toEqual(expect.any(Number));
  });

  it('meng-upsert review: 200, id sama, created_at tetap, updated_at maju', async () => {
    const { token } = await registerAndLogin('watched-upsert');

    const created = await request(app)
      .post('/api/watched')
      .set(auth(token))
      .send({ movieId: 2, rating: 5, review: 'Pertama' })
      .expect(201);

    const updated = await request(app)
      .post('/api/watched')
      .set(auth(token))
      .send({ movieId: 2, rating: 3, review: 'Diperbarui' });

    expect(updated.status).toBe(200);
    expect(updated.body.id).toBe(created.body.id);
    expect(updated.body.rating).toBe(3);
    expect(updated.body.review).toBe('Diperbarui');
    expect(updated.body.created_at).toBe(created.body.created_at);
    expect(new Date(updated.body.updated_at).getTime()).toBeGreaterThanOrEqual(
      new Date(created.body.updated_at).getTime(),
    );
  });

  it('menolak rating di luar 1-5 dan review tidak valid dengan 400', async () => {
    const { token } = await registerAndLogin('watched-invalid');
    const invalidBodies = [
      [{ movieId: 1, rating: 0, review: 'x' }, 'Rating harus bilangan bulat 1-5'],
      [{ movieId: 1, rating: 6, review: 'x' }, 'Rating harus bilangan bulat 1-5'],
      [{ movieId: 1, rating: 4.5, review: 'x' }, 'Rating harus bilangan bulat 1-5'],
      [{ movieId: 1, rating: 5, review: '   ' }, 'Review wajib diisi'],
      [{ movieId: 1, rating: 5, review: 'x'.repeat(2001) }, 'Review maksimal 2000 karakter'],
    ];

    for (const [body, message] of invalidBodies) {
      const res = await request(app).post('/api/watched').set(auth(token)).send(body);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe(message);
    }
  });

  it('menolak film yang tidak ada dengan 404', async () => {
    const { token } = await registerAndLogin('watched-missing');

    const res = await request(app)
      .post('/api/watched')
      .set(auth(token))
      .send({ movieId: 999, rating: 4, review: 'Film apa ini' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Film tidak ditemukan' });
  });

  it('mengabaikan field ekstra dari frontend', async () => {
    const { token } = await registerAndLogin('watched-extra');

    const res = await request(app)
      .post('/api/watched')
      .set(auth(token))
      .send({ movieId: 3, rating: 4, review: 'Oke', opinion: 'diabaikan', movie_id: 3 });

    expect(res.status).toBe(201);
    expect(res.body.movie_id).toBe(3);
    expect(res.body).not.toHaveProperty('opinion');
  });

  it('menampilkan daftar watched dan mengisolasi data antar user', async () => {
    const userA = await registerAndLogin('watched-a');
    const userB = await registerAndLogin('watched-b');

    await request(app)
      .post('/api/watched')
      .set(auth(userA.token))
      .send({ movieId: 4, rating: 5, review: 'Bagus' })
      .expect(201);

    const listA = await request(app).get('/api/watched').set(auth(userA.token));
    const listB = await request(app).get('/api/watched').set(auth(userB.token));

    expect(listA.status).toBe(200);
    expect(listA.body).toHaveLength(1);
    expect(listA.body[0]).toMatchObject({
      movie_id: 4,
      rating: 5,
      movie: { id: 4, title: expect.any(String) },
    });
    expect(listB.status).toBe(200);
    expect(listB.body).toEqual([]);
  });
});

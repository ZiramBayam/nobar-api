import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app, uniqueEmail } from './helpers.js';
import { pool } from '../src/db/pool.js';
import { env } from '../src/config/env.js';

describe('POST /api/auth/register', () => {
  it('mendaftarkan user, menormalkan email, dan tidak membocorkan password', async () => {
    const email = uniqueEmail('register');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: '  Vitest User  ', email: email.toUpperCase(), password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Registrasi berhasil');
    expect(res.body.user).toEqual({
      id: expect.any(Number),
      username: 'Vitest User',
      email,
    });
    expect(res.body.user).not.toHaveProperty('password_hash');
    expect(JSON.stringify(res.body)).not.toContain('password123');

    const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', [email]);
    expect(rows).toHaveLength(1);
    // bcrypt selalu menghasilkan prefix $2a$/$2b$/$2y$; plaintext tidak mungkin lolos.
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
    expect(rows[0].password_hash).not.toBe('password123');
  });

  it('menolak email yang sudah terdaftar dengan 409', async () => {
    const email = uniqueEmail('duplicate');
    const body = { username: 'Duplikat', email, password: 'password123' };

    expect((await request(app).post('/api/auth/register').send(body)).status).toBe(201);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...body, email: email.toUpperCase() });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: 'Email sudah terdaftar' });
  });

  it('menolak input tidak valid dengan 400 dan rincian field', async () => {
    const cases = [
      [{ email: 'a@example.com', password: 'password123' }, 'Username wajib diisi'],
      [{ username: 'A', email: 'bukan-email', password: 'password123' }, 'Format email tidak valid'],
      [{ username: 'A', email: 'a@example.com', password: 'pendek' }, 'Password minimal 8 karakter'],
      [
        { username: 'A', email: 'a@example.com', password: 'x'.repeat(73) },
        'Password maksimal 72 byte',
      ],
    ];

    for (const [body, message] of cases) {
      const res = await request(app).post('/api/auth/register').send(body);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe(message);
      expect(res.body.errors[0]).toEqual({ field: expect.any(String), message });
    }
  });
});

describe('POST /api/auth/login', () => {
  it('mengembalikan token HS256 dan user tanpa password_hash', async () => {
    const email = uniqueEmail('login');
    const password = 'password123';
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'Login User', email, password })
      .expect(201);

    const res = await request(app).post('/api/auth/login').send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: expect.any(Number),
      username: 'Login User',
      email,
    });
    expect(res.body.user).not.toHaveProperty('password_hash');
    expect(res.body.token.split('.')).toHaveLength(3);

    const decoded = jwt.decode(res.body.token, { complete: true });
    expect(decoded.header.alg).toBe('HS256');
    expect(typeof decoded.payload.sub).toBe('string');
  });

  it('memakai pesan generik untuk password salah dan email tidak terdaftar', async () => {
    const email = uniqueEmail('generic');
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'Generik', email, password: 'password123' })
      .expect(201);

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'password-salah' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail('tidak-ada'), password: 'password123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe('Email atau password salah');
    expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
  });

  it('menolak JSON rusak dan body kosong dengan 400, bukan 500', async () => {
    const broken = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{bad');
    const empty = await request(app).post('/api/auth/login').send({});

    expect(broken.status).toBe(400);
    expect(broken.body).toEqual({ message: 'Body JSON tidak valid' });
    expect(empty.status).toBe(400);
    expect(empty.body.message).toBe('Email wajib diisi');
  });
});

describe('Middleware auth', () => {
  it('menolak request tanpa token atau format header yang salah', async () => {
    const withoutToken = await request(app).get('/api/watchlist');
    const wrongScheme = await request(app)
      .get('/api/watchlist')
      .set('Authorization', 'Token abc');

    expect(withoutToken.status).toBe(401);
    expect(withoutToken.body).toEqual({ message: 'Token tidak ditemukan' });
    expect(wrongScheme.status).toBe(401);
    expect(wrongScheme.body).toEqual({ message: 'Token tidak ditemukan' });
  });

  it('menolak token rusak, token kedaluwarsa, dan algoritma selain HS256', async () => {
    const malformed = await request(app)
      .get('/api/watchlist')
      .set('Authorization', 'Bearer bukan.token.valid');

    const expired = jwt.sign({ sub: '1' }, env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: -1,
    });
    const expiredRes = await request(app)
      .get('/api/watchlist')
      .set('Authorization', `Bearer ${expired}`);

    const wrongAlgorithm = jwt.sign({ sub: '1' }, env.JWT_SECRET, {
      algorithm: 'HS512',
    });
    const wrongAlgorithmRes = await request(app)
      .get('/api/watchlist')
      .set('Authorization', `Bearer ${wrongAlgorithm}`);

    expect(malformed.status).toBe(401);
    expect(malformed.body).toEqual({ message: 'Token tidak valid' });
    expect(expiredRes.status).toBe(401);
    expect(expiredRes.body).toEqual({ message: 'Sesi berakhir, silakan login lagi' });
    expect(wrongAlgorithmRes.status).toBe(401);
    expect(wrongAlgorithmRes.body).toEqual({ message: 'Token tidak valid' });
  });

  it('tidak menolak endpoint publik meskipun token yang dikirim rusak', async () => {
    const res = await request(app)
      .get('/api/movies')
      .set('Authorization', 'Bearer token-basi-dari-frontend');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

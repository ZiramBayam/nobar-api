import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './helpers.js';

describe('Hardening response', () => {
  it('memasang header keamanan dari helmet dan menyembunyikan X-Powered-By', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('mengembalikan 400 untuk JSON rusak, bukan stack trace', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{rusak');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Body JSON tidak valid' });
    expect(JSON.stringify(res.body)).not.toMatch(/at\s+\w+|stack|syntaxerror/i);
  });

  it('menolak body lebih dari 10kb dengan 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'A', email: 'a@example.com', password: 'x'.repeat(20_000) });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Body request terlalu besar' });
  });

  it('tidak membocorkan detail SQL pada error validasi', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bukan-email', password: 'x' });

    expect(res.status).toBe(400);
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/select|insert|from users|pg_|syntax error/i);
  });
});

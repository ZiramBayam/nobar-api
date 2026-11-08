import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from './helpers.js';

describe('Rate limit login', () => {
  it('membalas 429 setelah 10 percobaan per menit dari IP yang sama', async () => {
    const statuses = [];

    for (let i = 0; i < 11; i += 1) {
      // Body kosong tetap dihitung: limiter dipasang sebelum validasi Zod.
      const res = await request(app).post('/api/auth/login').send({});
      statuses.push(res.status);

      if (res.status === 429) {
        expect(res.body).toEqual({
          message: 'Terlalu banyak percobaan login, coba lagi nanti',
        });
      }
    }

    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(400));
    expect(statuses[10]).toBe(429);
  });
});

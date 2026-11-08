import request from 'supertest';
import { createApp } from '../src/app.js';

// Satu instance app per file test, tanpa listen: supertest menangani port.
export const app = createApp();

let counter = 0;

export function uniqueEmail(label) {
  counter += 1;
  return `vitest-${label}-${process.pid}-${Date.now()}-${counter}@example.com`;
}

export async function registerAndLogin(label, password = 'password123') {
  const email = uniqueEmail(label);
  const username = `Vitest ${label}`;

  const register = await request(app)
    .post('/api/auth/register')
    .send({ username, email, password });

  if (register.status !== 201) {
    throw new Error(`register gagal: ${register.status} ${JSON.stringify(register.body)}`);
  }

  const login = await request(app).post('/api/auth/login').send({ email, password });

  if (login.status !== 200) {
    throw new Error(`login gagal: ${login.status} ${JSON.stringify(login.body)}`);
  }

  return {
    email,
    username,
    password,
    token: login.body.token,
    userId: login.body.user.id,
  };
}

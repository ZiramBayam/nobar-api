import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../lib/httpError.js';
import * as userRepository from '../repositories/user.repository.js';

// Hash dummy dengan cost yang sama seperti hash asli. Saat email tidak ada,
// login tetap menjalankan bcrypt.compare agar waktu respons tidak membocorkan
// apakah email tersebut terdaftar.
const DUMMY_HASH = bcrypt.hashSync('dummy-password', env.BCRYPT_ROUNDS);

export async function register({ username, email, password }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) throw new HttpError(409, 'Email sudah terdaftar');

  // Password hanya disimpan sebagai hash. Cost diambil dari env supaya bisa
  // dinaikkan tanpa mengubah kode; bcrypt hanya membaca 72 byte pertama.
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  try {
    const user = await userRepository.create({ username, email, passwordHash });
    return { message: 'Registrasi berhasil', user };
  } catch (err) {
    // Dua request register bersamaan bisa sama-sama lolos pengecekan di atas;
    // constraint UNIQUE email adalah lapis kedua yang mencegah duplikat.
    if (err.code === '23505') throw new HttpError(409, 'Email sudah terdaftar');
    throw err;
  }
}

export async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);

  // Selalu compare, termasuk saat user tidak ada. Tanpa ini, selisih waktu
  // respons bisa dipakai menebak email mana yang terdaftar.
  const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

  // Pesan sengaja sama untuk email tidak ada dan password salah.
  if (!user || !valid) throw new HttpError(401, 'Email atau password salah');

  // sub berupa string sesuai konvensi JWT; middleware auth mengubahnya ke number.
  const token = jwt.sign({ sub: String(user.id) }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN,
  });

  return {
    token,
    user: { id: user.id, username: user.username, email: user.email },
  };
}

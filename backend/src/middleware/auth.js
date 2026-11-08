import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../lib/httpError.js';

export function requireAuth(req, res, next) {
  const header = req.get('authorization');

  // Middleware ini hanya dipasang di rute protected. Endpoint publik tetap
  // menerima request meskipun frontend mengirim token basi.
  if (!header) return next(new HttpError(401, 'Token tidak ditemukan'));

  // Terima "Bearer <token>" (case-insensitive), tapi tolak header dengan
  // bagian tambahan supaya formatnya tidak ambigu.
  const match = header.match(/^Bearer\s+(\S+)$/i);
  if (!match) return next(new HttpError(401, 'Token tidak ditemukan'));

  const token = match[1];

  let payload;
  try {
    // Pin HS256: tanpa ini, token dengan algoritma lain bisa ikut dicoba.
    payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    // Pesan dibedakan supaya UI bisa menyuruh login ulang saat sesi habis.
    if (err.name === 'TokenExpiredError') {
      return next(new HttpError(401, 'Sesi berakhir, silakan login lagi'));
    }
    return next(new HttpError(401, 'Token tidak valid'));
  }

  const id = Number(payload.sub);
  if (!Number.isInteger(id) || id <= 0) {
    return next(new HttpError(401, 'Token tidak valid'));
  }

  // Auth stateless: tidak ada lookup user di DB per request (lihat DECISIONS C4).
  req.user = { id };
  next();
}

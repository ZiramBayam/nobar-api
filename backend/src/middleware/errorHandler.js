import { HttpError } from '../lib/httpError.js';

// Constraint PostgreSQL adalah lapis pertahanan terakhir (mis. dua request
// duplikat bersamaan). Menerjemahkannya di satu tempat membuat repository
// tetap murni SQL dan service tidak perlu menebak kode error driver.
function mapPostgresError(err) {
  if (err.code === '23505') {
    const message =
      err.constraint === 'watchlist_pkey' ? 'Film sudah ada di watchlist' : 'Data sudah ada';
    return new HttpError(409, message);
  }

  if (err.code === '23503') {
    // Nama constraint default Postgres: <tabel>_<kolom>_fkey.
    if (err.constraint?.endsWith('_movie_id_fkey')) {
      return new HttpError(404, 'Film tidak ditemukan');
    }
    // User di token sudah dihapus: token masih valid secara tanda tangan,
    // tetapi datanya tidak bisa disimpan lagi. UI disuruh login ulang.
    if (err.constraint?.endsWith('_user_id_fkey')) {
      return new HttpError(401, 'Sesi berakhir, silakan login lagi');
    }
    return new HttpError(400, 'Data terkait tidak valid');
  }

  if (err.code === '23514') return new HttpError(400, 'Data tidak valid');

  return null;
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // Error parser JSON dari express.json() punya status 400, tetapi pesannya
  // berbahasa Inggris dan teknis; ganti dengan pesan yang layak tampil ke user.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Body JSON tidak valid' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(400).json({ message: 'Body request terlalu besar' });
  }

  const mapped = mapPostgresError(err);
  const status = mapped?.status ?? err.status ?? err.statusCode ?? 500;
  const message = mapped?.message ?? err.message;
  const errors = mapped?.errors ?? err.errors;

  // Detail error hanya ke log server; client tidak boleh melihat stack/SQL.
  if (status >= 500) console.error(err);

  const body = {
    message: status >= 500 ? 'Terjadi kesalahan pada server' : message,
  };

  // Kegagalan validasi menyertakan rincian per field; frontend tetap hanya
  // membaca `message`, field ini untuk debugging dan klien lain.
  if (status < 500 && Array.isArray(errors)) body.errors = errors;

  res.status(status).json(body);
}

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

  const status = err.status || err.statusCode || 500;

  // Detail error hanya ke log server; client tidak boleh melihat stack/SQL.
  if (status >= 500) console.error(err);

  const body = {
    message: status >= 500 ? 'Terjadi kesalahan pada server' : err.message,
  };

  // Kegagalan validasi menyertakan rincian per field; frontend tetap hanya
  // membaca `message`, field ini untuk debugging dan klien lain.
  if (status < 500 && Array.isArray(err.errors)) body.errors = err.errors;

  res.status(status).json(body);
}

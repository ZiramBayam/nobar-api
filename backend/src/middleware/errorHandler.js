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

  res.status(status).json({
    message: status >= 500 ? 'Terjadi kesalahan pada server' : err.message,
  });
}

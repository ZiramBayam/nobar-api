export function notFound(req, res) {
  res.status(404).json({ message: 'Endpoint tidak ditemukan' });
}

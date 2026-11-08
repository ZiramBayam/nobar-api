import { rateLimit } from 'express-rate-limit';

// Login adalah target tebakan password; batasi per IP. Store default adalah
// memory, cukup untuk satu instance. Kalau nanti jalan multi-replica, pindah
// ke store bersama (mis. Redis) agar limit berlaku global.
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ message: 'Terlalu banyak percobaan login, coba lagi nanti' });
  },
});

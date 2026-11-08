import { Router } from 'express';
import { loginLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../schemas/auth.js';
import * as authService from '../services/auth.service.js';

export const authRouter = Router();

authRouter.post('/register', validate({ body: registerSchema }), async (req, res) => {
  const result = await authService.register(req.validated.body);
  res.status(201).json(result);
});

// Rate limit dipasang sebelum validasi Zod supaya percobaan dengan field
// tidak valid ikut dihitung sebagai percobaan login.
authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), async (req, res) => {
  const result = await authService.login(req.validated.body);
  res.status(200).json(result);
});

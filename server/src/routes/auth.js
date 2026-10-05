import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../utils.js';

const router = Router();

const sign = (user) =>
  jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    subject: String(user.id),
    expiresIn: '8h',
  });

const publicUser = ({ id, name, email, role, department_id, weekly_target_hours }) => ({
  id, name, email, role, department_id, weekly_target_hours,
});

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(100),
});

router.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body);
  const hash = await bcrypt.hash(data.password, 12);
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'teacher') RETURNING *`,
    [data.name, data.email, hash]
  );
  res.status(201).json({ token: sign(rows[0]), user: publicUser(rows[0]) });
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

router.post('/login', async (req, res) => {
  const data = loginSchema.parse(req.body);
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [data.email]);
  const user = rows[0];
  const ok = user && (await bcrypt.compare(data.password, user.password_hash));
  if (!ok) throw new HttpError(401, 'Email or password is incorrect.');
  res.json({ token: sign(user), user: publicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!rows[0]) throw new HttpError(401, 'This account no longer exists.');
  res.json({ user: publicUser(rows[0]) });
});

export default router;

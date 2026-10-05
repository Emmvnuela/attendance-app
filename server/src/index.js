import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { requireAuth, requireAdmin } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/sessions.js';
import courseRoutes from './routes/courses.js';
import teacherRoutes from './routes/teachers.js';
import departmentRoutes from './routes/departments.js';
import dashboardRoutes from './routes/dashboard.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env and set a long random value.');
  process.exit(1);
}

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a few minutes.' },
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/sessions', requireAuth, sessionRoutes);
app.use('/api/courses', requireAuth, courseRoutes);
app.use('/api/departments', requireAuth, departmentRoutes);
app.use('/api/teachers', requireAuth, requireAdmin, teacherRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const message = err.issues.map((i) => i.message).join(' ');
    return res.status(400).json({
      error: message,
      fields: Object.fromEntries(err.issues.map((i) => [i.path.join('.'), i.message])),
    });
  }
  if (err.status) return res.status(err.status).json({ error: err.message });
  if (err.code === '23505') return res.status(409).json({ error: 'That value is already in use.' });
  if (err.code === '23503') return res.status(409).json({ error: 'This record is linked to other data and cannot be changed that way.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Try again.' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));

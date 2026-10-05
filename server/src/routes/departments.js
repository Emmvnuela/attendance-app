import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', async (_req, res) => {
  const { rows } = await query('SELECT id, name FROM departments ORDER BY name');
  res.json(rows);
});

router.post('/', requireAdmin, async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(2, 'Enter a department name.').max(100) }).parse(req.body);
  const { rows } = await query('INSERT INTO departments (name) VALUES ($1) RETURNING id, name', [name]);
  res.status(201).json(rows[0]);
});

export default router;

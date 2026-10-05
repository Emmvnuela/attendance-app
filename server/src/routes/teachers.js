import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db.js';
import { HttpError, HOURS } from '../utils.js';

const router = Router(); // mounted behind requireAuth + requireAdmin

router.get('/', async (_req, res) => {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.department_id, u.weekly_target_hours, d.name AS department_name,
            ROUND(COALESCE(SUM(${HOURS}) FILTER (WHERE s.status = 'held'), 0)::numeric, 2) AS total_hours,
            COUNT(s.id) FILTER (WHERE s.status = 'held') AS sessions_held,
            COUNT(s.id) FILTER (WHERE s.status = 'cancelled') AS sessions_cancelled
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN sessions s ON s.teacher_id = u.id
     WHERE u.role = 'teacher'
     GROUP BY u.id, d.name
     ORDER BY u.name`
  );
  res.json(rows);
});

const teacherSchema = z.object({
  name: z.string().trim().min(2, 'Enter the teacher’s full name.').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(100),
  department_id: z.number().int().positive().nullable().optional(),
  weekly_target_hours: z.number().min(0).max(80).default(12),
});

router.post('/', async (req, res) => {
  const d = teacherSchema.parse(req.body);
  const hash = await bcrypt.hash(d.password, 12);
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role, department_id, weekly_target_hours)
     VALUES ($1,$2,$3,'teacher',$4,$5) RETURNING id, name, email, department_id, weekly_target_hours`,
    [d.name, d.email, hash, d.department_id ?? null, d.weekly_target_hours]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await query(`DELETE FROM users WHERE id = $1 AND role = 'teacher'`, [Number(req.params.id)]);
  if (!rowCount) throw new HttpError(404, 'Teacher not found.');
  res.status(204).end();
});

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { HttpError, HOURS } from '../utils.js';

const router = Router();

const courseSchema = z.object({
  code: z.string().trim().min(2, 'Enter a course code.').max(20),
  title: z.string().trim().min(2, 'Enter a course title.').max(150),
  department_id: z.number().int().positive().nullable().optional(),
  teacher_id: z.number().int().positive().nullable().optional(),
  planned_hours: z.number().positive('Planned hours must be more than 0.').max(2000),
});

router.get('/', async (req, res) => {
  const teacherId = req.user.role === 'admin' ? null : req.user.id;
  const { rows } = await query(
    `SELECT c.id, c.code, c.title, c.department_id, c.teacher_id, c.planned_hours,
            d.name AS department_name, u.name AS teacher_name,
            ROUND(COALESCE(SUM(${HOURS}) FILTER (WHERE s.status = 'held'), 0)::numeric, 2) AS held_hours
     FROM courses c
     LEFT JOIN departments d ON d.id = c.department_id
     LEFT JOIN users u ON u.id = c.teacher_id
     LEFT JOIN sessions s ON s.course_id = c.id
     WHERE ($1::int IS NULL OR c.teacher_id = $1)
     GROUP BY c.id, d.name, u.name
     ORDER BY c.code`,
    [teacherId]
  );
  res.json(rows);
});

router.post('/', requireAdmin, async (req, res) => {
  const d = courseSchema.parse(req.body);
  const { rows } = await query(
    `INSERT INTO courses (code, title, department_id, teacher_id, planned_hours) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [d.code, d.title, d.department_id ?? null, d.teacher_id ?? null, d.planned_hours]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', requireAdmin, async (req, res) => {
  const d = courseSchema.parse(req.body);
  const { rows } = await query(
    `UPDATE courses SET code=$1, title=$2, department_id=$3, teacher_id=$4, planned_hours=$5 WHERE id=$6 RETURNING *`,
    [d.code, d.title, d.department_id ?? null, d.teacher_id ?? null, d.planned_hours, Number(req.params.id)]
  );
  if (!rows[0]) throw new HttpError(404, 'Course not found.');
  res.json(rows[0]);
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const { rowCount } = await query('DELETE FROM courses WHERE id = $1', [Number(req.params.id)]);
  if (!rowCount) throw new HttpError(404, 'Course not found.');
  res.status(204).end();
});

export default router;

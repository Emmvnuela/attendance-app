import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { HttpError } from '../utils.js';

const router = Router();

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
const count = z.number().int().min(0).nullable().optional();

const sessionSchema = z
  .object({
    course_id: z.number().int().positive('Choose a course.'),
    session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date.'),
    start_time: z.string().regex(timeRe, 'Enter a start time (HH:MM).'),
    end_time: z.string().regex(timeRe, 'Enter an end time (HH:MM).'),
    status: z.enum(['held', 'cancelled', 'scheduled']).default('held'),
    topic: z.string().trim().max(200).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    students_present: count,
    students_enrolled: count,
  })
  .refine((d) => d.end_time > d.start_time, {
    message: 'End time must be after the start time.',
    path: ['end_time'],
  })
  .refine(
    (d) => d.students_present == null || d.students_enrolled == null || d.students_present <= d.students_enrolled,
    { message: 'Students present cannot exceed students enrolled.', path: ['students_present'] }
  );

const SELECT = `
  SELECT s.id, s.course_id, s.teacher_id, s.session_date,
         to_char(s.start_time, 'HH24:MI') AS start_time,
         to_char(s.end_time, 'HH24:MI') AS end_time,
         s.status, s.topic, s.notes, s.students_present, s.students_enrolled,
         ROUND(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600.0, 2) AS hours,
         c.code AS course_code, c.title AS course_title, u.name AS teacher_name
  FROM sessions s
  JOIN courses c ON c.id = s.course_id
  JOIN users u ON u.id = s.teacher_id`;

router.get('/', async (req, res) => {
  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };

  if (req.user.role !== 'admin') add('s.teacher_id = ?', req.user.id);
  else if (req.query.teacher_id) add('s.teacher_id = ?', Number(req.query.teacher_id));
  if (req.query.course_id) add('s.course_id = ?', Number(req.query.course_id));
  if (req.query.status) add('s.status = ?', String(req.query.status));
  if (req.query.from) add('s.session_date >= ?', String(req.query.from));
  if (req.query.to) add('s.session_date <= ?', String(req.query.to));

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Number(req.query.offset) || 0;

  const [list, totals] = await Promise.all([
    query(`${SELECT} ${clause} ORDER BY s.session_date DESC, s.start_time DESC LIMIT ${limit} OFFSET ${offset}`, params),
    query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600.0) FILTER (WHERE s.status = 'held'), 0) AS held_hours
       FROM sessions s ${clause}`,
      params
    ),
  ]);
  res.json({
    rows: list.rows,
    total: totals.rows[0].total,
    held_hours: Math.round(Number(totals.rows[0].held_hours) * 100) / 100,
  });
});

async function resolveCourse(req, courseId) {
  const { rows } = await query('SELECT id, teacher_id FROM courses WHERE id = $1', [courseId]);
  const course = rows[0];
  if (!course) throw new HttpError(404, 'Course not found.');
  if (!course.teacher_id) throw new HttpError(400, 'Assign a teacher to this course first.');
  if (req.user.role !== 'admin' && course.teacher_id !== req.user.id)
    throw new HttpError(403, 'You can only log sessions for your own courses.');
  return course;
}

async function assertNoOverlap(teacherId, data, excludeId = null) {
  if (data.status === 'cancelled') return;
  const { rowCount } = await query(
    `SELECT 1 FROM sessions
     WHERE teacher_id = $1 AND session_date = $2 AND status <> 'cancelled'
       AND start_time < $4 AND end_time > $3
       AND ($5::int IS NULL OR id <> $5)
     LIMIT 1`,
    [teacherId, data.session_date, data.start_time, data.end_time, excludeId]
  );
  if (rowCount) throw new HttpError(409, 'This teacher already has a session that overlaps this time.');
}

router.post('/', async (req, res) => {
  const data = sessionSchema.parse(req.body);
  const course = await resolveCourse(req, data.course_id);
  await assertNoOverlap(course.teacher_id, data);
  const { rows } = await query(
    `INSERT INTO sessions (course_id, teacher_id, session_date, start_time, end_time, status, topic, notes, students_present, students_enrolled)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [data.course_id, course.teacher_id, data.session_date, data.start_time, data.end_time, data.status,
     data.topic || null, data.notes || null, data.students_present ?? null, data.students_enrolled ?? null]
  );
  const created = await query(`${SELECT} WHERE s.id = $1`, [rows[0].id]);
  res.status(201).json(created.rows[0]);
});

async function loadOwned(req) {
  const { rows } = await query('SELECT id, teacher_id FROM sessions WHERE id = $1', [Number(req.params.id)]);
  const existing = rows[0];
  if (!existing) throw new HttpError(404, 'Session not found.');
  if (req.user.role !== 'admin' && existing.teacher_id !== req.user.id)
    throw new HttpError(403, 'You can only change your own sessions.');
  return existing;
}

router.put('/:id', async (req, res) => {
  const existing = await loadOwned(req);
  const data = sessionSchema.parse(req.body);
  const course = await resolveCourse(req, data.course_id);
  await assertNoOverlap(course.teacher_id, data, existing.id);
  await query(
    `UPDATE sessions SET course_id=$1, teacher_id=$2, session_date=$3, start_time=$4, end_time=$5, status=$6,
            topic=$7, notes=$8, students_present=$9, students_enrolled=$10 WHERE id=$11`,
    [data.course_id, course.teacher_id, data.session_date, data.start_time, data.end_time, data.status,
     data.topic || null, data.notes || null, data.students_present ?? null, data.students_enrolled ?? null, existing.id]
  );
  const updated = await query(`${SELECT} WHERE s.id = $1`, [existing.id]);
  res.json(updated.rows[0]);
});

router.delete('/:id', async (req, res) => {
  const existing = await loadOwned(req);
  await query('DELETE FROM sessions WHERE id = $1', [existing.id]);
  res.status(204).end();
});

export default router;

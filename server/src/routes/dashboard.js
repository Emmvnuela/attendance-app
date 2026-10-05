import { Router } from 'express';
import { query } from '../db.js';
import { HOURS } from '../utils.js';

const router = Router();
const round = (n, d = 1) => Math.round(Number(n || 0) * 10 ** d) / 10 ** d;

router.get('/summary', async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const scope = isAdmin ? null : req.user.id; // teachers only ever see their own numbers

  const totalsQ = query(
    `SELECT COALESCE(SUM(${HOURS}) FILTER (WHERE s.status = 'held'), 0) AS total_hours,
            COALESCE(SUM(${HOURS}) FILTER (WHERE s.status = 'held' AND s.session_date >= date_trunc('month', CURRENT_DATE)::date), 0) AS month_hours,
            COUNT(*) FILTER (WHERE s.status = 'held') AS held,
            COUNT(*) FILTER (WHERE s.status = 'cancelled') AS cancelled,
            AVG(s.students_present::numeric / NULLIF(s.students_enrolled, 0)) FILTER (WHERE s.status = 'held') AS attendance
     FROM sessions s WHERE ($1::int IS NULL OR s.teacher_id = $1)`,
    [scope]
  );

  const weeklyQ = query(
    `SELECT w::date AS week_start, COALESCE(SUM(x.hours), 0) AS hours
     FROM generate_series(date_trunc('week', CURRENT_DATE) - interval '7 weeks', date_trunc('week', CURRENT_DATE), interval '1 week') w
     LEFT JOIN (
       SELECT date_trunc('week', s.session_date)::date AS wk, ${HOURS} AS hours
       FROM sessions s WHERE s.status = 'held' AND ($1::int IS NULL OR s.teacher_id = $1)
     ) x ON x.wk = w::date
     GROUP BY w ORDER BY w`,
    [scope]
  );

  const byCourseQ = query(
    `SELECT c.id, c.code, c.title, c.planned_hours, u.name AS teacher_name,
            COALESCE(SUM(${HOURS}) FILTER (WHERE s.status = 'held'), 0) AS held_hours
     FROM courses c
     LEFT JOIN users u ON u.id = c.teacher_id
     LEFT JOIN sessions s ON s.course_id = c.id
     WHERE ($1::int IS NULL OR c.teacher_id = $1)
     GROUP BY c.id, u.name ORDER BY held_hours DESC`,
    [scope]
  );

  const recentQ = query(
    `SELECT s.id, s.session_date, to_char(s.start_time,'HH24:MI') AS start_time, to_char(s.end_time,'HH24:MI') AS end_time,
            s.status, s.topic, c.code AS course_code, c.title AS course_title, u.name AS teacher_name,
            ROUND((${HOURS})::numeric, 2) AS hours
     FROM sessions s JOIN courses c ON c.id = s.course_id JOIN users u ON u.id = s.teacher_id
     WHERE ($1::int IS NULL OR s.teacher_id = $1)
     ORDER BY s.session_date DESC, s.start_time DESC LIMIT 6`,
    [scope]
  );

  const lowAttQ = query(
    `SELECT s.id, s.session_date, c.code AS course_code, c.title AS course_title, u.name AS teacher_name,
            s.students_present, s.students_enrolled
     FROM sessions s JOIN courses c ON c.id = s.course_id JOIN users u ON u.id = s.teacher_id
     WHERE s.status = 'held' AND s.students_enrolled > 0 AND s.session_date >= CURRENT_DATE - 30
       AND s.students_present::numeric / s.students_enrolled < 0.6
       AND ($1::int IS NULL OR s.teacher_id = $1)
     ORDER BY s.students_present::numeric / s.students_enrolled LIMIT 5`,
    [scope]
  );

  const quietQ = query(
    `SELECT c.id, c.code, c.title, u.name AS teacher_name, MAX(s.session_date) AS last_session
     FROM courses c
     JOIN users u ON u.id = c.teacher_id
     LEFT JOIN sessions s ON s.course_id = c.id AND s.status = 'held'
     WHERE ($1::int IS NULL OR c.teacher_id = $1)
     GROUP BY c.id, u.name
     HAVING MAX(s.session_date) IS NULL OR MAX(s.session_date) < CURRENT_DATE - 14
     ORDER BY MAX(s.session_date) NULLS FIRST LIMIT 5`,
    [scope]
  );

  const adminQs = isAdmin
    ? [
        query(
          `SELECT u.id, u.name, d.name AS department, u.weekly_target_hours,
                  COALESCE(SUM(${HOURS}) FILTER (WHERE s.status = 'held'), 0) AS total_hours,
                  COALESCE(SUM(${HOURS}) FILTER (WHERE s.status = 'held' AND s.session_date >= date_trunc('month', CURRENT_DATE)::date), 0) AS month_hours,
                  COUNT(s.id) FILTER (WHERE s.status = 'held') AS sessions
           FROM users u LEFT JOIN departments d ON d.id = u.department_id LEFT JOIN sessions s ON s.teacher_id = u.id
           WHERE u.role = 'teacher' GROUP BY u.id, d.name ORDER BY total_hours DESC`
        ),
        query(
          `SELECT COALESCE(d.name, 'Unassigned') AS name,
                  COALESCE(SUM(${HOURS}) FILTER (WHERE s.status = 'held'), 0) AS hours
           FROM courses c LEFT JOIN departments d ON d.id = c.department_id LEFT JOIN sessions s ON s.course_id = c.id
           GROUP BY d.name ORDER BY hours DESC`
        ),
        query(`SELECT COUNT(*) AS n FROM users WHERE role = 'teacher'`),
        query(`SELECT COUNT(*) AS n FROM courses`),
      ]
    : [];

  const [totals, weekly, byCourse, recent, lowAtt, quiet, ...admin] = await Promise.all([
    totalsQ, weeklyQ, byCourseQ, recentQ, lowAttQ, quietQ, ...adminQs,
  ]);

  const t = totals.rows[0];
  res.json({
    role: req.user.role,
    totals: {
      total_hours: round(t.total_hours, 1),
      month_hours: round(t.month_hours, 1),
      sessions_held: t.held,
      sessions_cancelled: t.cancelled,
      cancellation_rate: t.held + t.cancelled ? round((100 * t.cancelled) / (t.held + t.cancelled), 1) : 0,
      attendance_rate: t.attendance == null ? null : round(Number(t.attendance) * 100, 1),
      teachers: isAdmin ? admin[2].rows[0].n : null,
      courses: isAdmin ? admin[3].rows[0].n : byCourse.rows.length,
    },
    weekly: weekly.rows.map((r) => ({ week_start: r.week_start, hours: round(r.hours, 1) })),
    by_course: byCourse.rows.map((r) => ({ ...r, planned_hours: Number(r.planned_hours), held_hours: round(r.held_hours, 1) })),
    by_teacher: isAdmin
      ? admin[0].rows.map((r) => ({ ...r, total_hours: round(r.total_hours, 1), month_hours: round(r.month_hours, 1) }))
      : null,
    by_department: isAdmin ? admin[1].rows.map((r) => ({ name: r.name, hours: round(r.hours, 1) })) : null,
    recent: recent.rows,
    attention: { low_attendance: lowAtt.rows, quiet_courses: quiet.rows },
  });
});

export default router;

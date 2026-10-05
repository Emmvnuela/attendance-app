import bcrypt from 'bcryptjs';
import pool, { query } from './db.js';

const { rows: [{ n }] } = await query('SELECT COUNT(*) AS n FROM users');
if (n > 0) {
  console.log('Database already has users; skipping seed.');
  await pool.end();
  process.exit(0);
}

const adminHash = await bcrypt.hash('Admin123!', 12);
const teacherHash = await bcrypt.hash('Teacher123!', 12);

const dept = {};
for (const name of ['Mathematics', 'Sciences', 'Languages']) {
  dept[name] = (await query('INSERT INTO departments (name) VALUES ($1) RETURNING id', [name])).rows[0].id;
}

await query(
  `INSERT INTO users (name,email,password_hash,role) VALUES ('Registrar Office','admin@school.test',$1,'admin')`,
  [adminHash]
);

const teachers = [
  ['Amara Diallo', 'amara@school.test', 'Mathematics', 14],
  ['Koffi Mensah', 'koffi@school.test', 'Sciences', 12],
  ['Claire Dubois', 'claire@school.test', 'Languages', 10],
];
const tid = [];
for (const [name, email, d, target] of teachers) {
  tid.push(
    (await query(
      `INSERT INTO users (name,email,password_hash,role,department_id,weekly_target_hours) VALUES ($1,$2,$3,'teacher',$4,$5) RETURNING id`,
      [name, email, teacherHash, dept[d], target]
    )).rows[0].id
  );
}

const courses = [
  ['MAT101', 'Calculus I', 'Mathematics', 0, 60],
  ['MAT204', 'Linear Algebra', 'Mathematics', 0, 45],
  ['SCI110', 'Physics Foundations', 'Sciences', 1, 50],
  ['SCI230', 'Organic Chemistry', 'Sciences', 1, 40],
  ['LAN120', 'Academic French', 'Languages', 2, 36],
  ['LAN210', 'Technical English', 'Languages', 2, 30],
];
const cid = [];
for (const [code, title, d, t, hrs] of courses) {
  const { rows } = await query(
    `INSERT INTO courses (code,title,department_id,teacher_id,planned_hours) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [code, title, dept[d], tid[t], hrs]
  );
  cid.push({ id: rows[0].id, teacher: tid[t] });
}

// Ten weeks of history: each course meets twice a week; a few sessions are cancelled.
const slots = [['08:00', '10:00'], ['10:30', '12:00'], ['14:00', '16:00'], ['16:00', '17:30']];
let seed = 7;
const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const today = new Date();
for (let w = 9; w >= 0; w--) {
  for (let i = 0; i < cid.length; i++) {
    // Each teacher teaches two courses: give them different slots so sessions never overlap.
    const base = i % 2;
    for (const [dayOffset, slotIdx] of [[base, base], [2 + base, 2 + base]]) {
      const d = new Date(today);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - w * 7 + dayOffset + (i >> 1));
      if (d > today) continue;
      const date = d.toISOString().slice(0, 10);
      const [start, end] = slots[slotIdx];
      const cancelled = rnd() < 0.08;
      const enrolled = 28 + Math.floor(rnd() * 10);
      const present = Math.max(8, enrolled - Math.floor(rnd() * (rnd() < 0.1 ? 18 : 7)));
      await query(
        `INSERT INTO sessions (course_id,teacher_id,session_date,start_time,end_time,status,topic,students_present,students_enrolled)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [cid[i].id, cid[i].teacher, date, start, end, cancelled ? 'cancelled' : 'held',
         cancelled ? 'Cancelled' : `Week ${10 - w} lecture`, cancelled ? null : present, cancelled ? null : enrolled]
      );
    }
  }
}

console.log('Seeded. Admin: admin@school.test / Admin123!   Teacher: amara@school.test / Teacher123!');
await pool.end();

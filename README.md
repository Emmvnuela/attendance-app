# Lecture Ledger — attendance and teaching-hours tracker

Teachers log lecture sessions (date, time, status, attendance). The app adds up teaching hours per teacher,
course and week, and gives administrators a dashboard of the numbers that matter.

**Stack:** React 18 · Tailwind CSS · Framer Motion · Node.js · Express 5 · PostgreSQL · JWT

## Run it locally

Requirements: Node 18+ and a PostgreSQL database.

```bash
# 1. Database
createdb attendance

# 2. API
cd server
cp .env.example .env        # set DATABASE_URL and a long random JWT_SECRET
npm install
npm run migrate             # creates the tables
npm run seed                # optional: demo school with 10 weeks of sessions
npm run dev                 # http://localhost:4000

# 3. Client (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173 (proxies /api to the server)
```

Demo accounts created by `npm run seed`:

| Role    | Email               | Password     |
|---------|---------------------|--------------|
| Admin   | admin@school.test   | Admin123!    |
| Teacher | amara@school.test   | Teacher123!  |

Change or delete these before any real use.

## How it works

- **Roles.** `admin` sees everything and manages teachers and courses. `teacher` sees only their own sessions and courses.
  Public sign-up creates teacher accounts only; admins are created in the database (the seed script does it).
- **Hours.** Cumulative hours = sum of (end − start) over sessions with status `held`. Cancelled and scheduled sessions do not count.
- **Safeguards.** A teacher cannot log a session for someone else's course, and overlapping sessions for the same teacher are rejected.

## API

All routes except `/api/auth/*` need `Authorization: Bearer <token>`.

| Method | Route | Who | Purpose |
|---|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | public | Create a teacher account / sign in (rate-limited) |
| GET | `/api/auth/me` | any | Current user |
| GET | `/api/dashboard/summary` | any | Totals, weekly hours, per-teacher/course hours, alerts (scoped by role) |
| GET/POST | `/api/sessions` | any | List (filters: `from`, `to`, `course_id`, `status`, `teacher_id` for admins) / log a session |
| PUT/DELETE | `/api/sessions/:id` | owner or admin | Edit / delete |
| GET | `/api/courses` | any | Courses with hours held vs planned |
| POST/PUT/DELETE | `/api/courses[/:id]` | admin | Manage courses |
| GET/POST/DELETE | `/api/teachers[/:id]` | admin | Teachers with cumulative hours |
| GET/POST | `/api/departments` | any / admin | Departments |

## Before you deploy

- Serve over HTTPS and set `CLIENT_ORIGIN` to your real site URL.
- The JWT is kept in `localStorage` for simplicity. For stricter security, move it to an httpOnly cookie with CSRF protection.
- Tokens last 8 hours and there is no refresh flow. Add one if you need longer sessions.
- Set a strong `JWT_SECRET` and use a managed Postgres with backups.

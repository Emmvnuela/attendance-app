CREATE TABLE IF NOT EXISTS departments (
  id   SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id                  SERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  email               TEXT UNIQUE NOT NULL,
  password_hash       TEXT NOT NULL,
  role                TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('admin', 'teacher')),
  department_id       INT REFERENCES departments(id) ON DELETE SET NULL,
  weekly_target_hours NUMERIC(5,2) NOT NULL DEFAULT 12,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id             SERIAL PRIMARY KEY,
  code           TEXT UNIQUE NOT NULL,
  title          TEXT NOT NULL,
  department_id  INT REFERENCES departments(id) ON DELETE SET NULL,
  teacher_id     INT REFERENCES users(id) ON DELETE SET NULL,
  planned_hours  NUMERIC(6,1) NOT NULL DEFAULT 30 CHECK (planned_hours > 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id                SERIAL PRIMARY KEY,
  course_id         INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_date      DATE NOT NULL,
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  status            TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'cancelled', 'scheduled')),
  topic             TEXT,
  notes             TEXT,
  students_present  INT CHECK (students_present >= 0),
  students_enrolled INT CHECK (students_enrolled >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  CHECK (students_present IS NULL OR students_enrolled IS NULL OR students_present <= students_enrolled)
);

CREATE INDEX IF NOT EXISTS sessions_teacher_date_idx ON sessions (teacher_id, session_date);
CREATE INDEX IF NOT EXISTS sessions_course_idx ON sessions (course_id);

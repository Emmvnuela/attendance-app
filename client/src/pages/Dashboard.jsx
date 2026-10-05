import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Empty, ErrorNote, StatusPill, fmtDate, fmtH } from '../components/ui.jsx';

const ease = [0.2, 0.7, 0.2, 1];

function Stat({ label, value, sub }) {
  return (
    <div className="bg-white px-5 py-4">
      <div className="text-sm text-ink/65">{label}</div>
      <div className="tabular font-display text-3xl font-bold">{value}</div>
      {sub && <div className="text-xs text-ink/60">{sub}</div>}
    </div>
  );
}

// A ruler-style bar: one tick every `tickEvery` hours. Bars grow once, in sequence, on load.
function RulerBar({ parts, max, tickEvery = 10, index = 0 }) {
  const tick = Math.max((tickEvery / max) * 100, 2);
  return (
    <div
      className="relative h-4 w-full rounded-sm bg-line/50"
      style={{ backgroundImage: 'linear-gradient(to right, transparent calc(100% - 1px), rgba(21,33,29,.25) 0)', backgroundSize: `${tick}% 100%` }}
    >
      <div className="absolute inset-y-0 left-0 flex w-full overflow-hidden rounded-sm">
        {parts.map((p, i) => (
          <motion.div
            key={i}
            className={p.className}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((p.value / max) * 100, 100)}%` }}
            transition={{ duration: 0.9, delay: 0.1 + index * 0.09 + i * 0.05, ease }}
          />
        ))}
      </div>
    </div>
  );
}

function Ledger({ data, isAdmin }) {
  if (isAdmin) {
    const rows = data.by_teacher;
    const max = Math.max(10, ...rows.map((r) => r.total_hours));
    if (!rows.length) return <Empty>No teachers yet. Add one from the Teachers page.</Empty>;
    return (
      <ul className="divide-y divide-line">
        {rows.map((r, i) => (
          <li key={r.id} className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr_5rem] sm:items-center sm:gap-4">
            <div>
              <div className="font-medium">{r.name}</div>
              <div className="text-xs text-ink/60">{r.department || 'No department'} · {r.sessions} sessions</div>
            </div>
            <RulerBar max={max} index={i} parts={[
              { value: r.total_hours - r.month_hours, className: 'bg-board' },
              { value: r.month_hours, className: 'bg-sun' },
            ]} />
            <div className="tabular text-right font-semibold">{fmtH(r.total_hours)}</div>
          </li>
        ))}
      </ul>
    );
  }
  const rows = data.by_course;
  if (!rows.length) return <Empty>No courses are assigned to you yet. Ask an administrator to assign one.</Empty>;
  return (
    <ul className="divide-y divide-line">
      {rows.map((r, i) => (
        <li key={r.id} className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr_7rem] sm:items-center sm:gap-4">
          <div>
            <div className="font-medium">{r.code}</div>
            <div className="text-xs text-ink/60">{r.title}</div>
          </div>
          <RulerBar max={r.planned_hours} index={i} tickEvery={10} parts={[{ value: r.held_hours, className: r.held_hours >= r.planned_hours ? 'bg-moss' : 'bg-board' }]} />
          <div className="tabular text-right text-sm"><span className="font-semibold">{fmtH(r.held_hours)}</span> of {r.planned_hours}</div>
        </li>
      ))}
    </ul>
  );
}

function WeeklyBars({ weekly }) {
  const max = Math.max(1, ...weekly.map((w) => w.hours));
  return (
    <div className="flex h-40 items-end gap-2" role="img" aria-label="Hours taught per week over the last eight weeks">
      {weekly.map((w, i) => (
        <div key={w.week_start} className="flex flex-1 flex-col items-center justify-end gap-1">
          <span className="tabular text-xs text-ink/70">{w.hours}</span>
          <motion.div
            className={`w-full rounded-t-sm ${i === weekly.length - 1 ? 'bg-sun' : 'bg-board'}`}
            initial={{ height: 0 }} animate={{ height: `${(w.hours / max) * 100}px` }}
            transition={{ duration: 0.7, delay: 0.3 + i * 0.05, ease }}
          />
          <span className="text-[11px] text-ink/60">{new Date(`${w.week_start}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/dashboard/summary').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <p className="text-sm text-ink/60">Loading overview…</p>;
  const { totals: t, attention } = data;
  const nothingToFlag = !attention.low_attendance.length && !attention.quiet_courses.length;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{isAdmin ? 'School overview' : `Hello, ${user.name.split(' ')[0]}`}</h1>
          <p className="text-sm text-ink/65">{isAdmin ? 'Hours and attendance across all teachers.' : 'Your teaching hours and attendance.'}</p>
        </div>
        <Link to="/sessions" className="rounded-md bg-sun px-4 py-2 text-sm font-semibold hover:bg-[#f2c01f]">Log a session</Link>
      </header>

      <section aria-label="Key figures" className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-5 [&>*:last-child]:col-span-2 md:[&>*:last-child]:col-span-1">
        <Stat label="Hours taught" value={fmtH(t.total_hours)} />
        <Stat label="This month" value={fmtH(t.month_hours)} />
        <Stat label="Sessions held" value={t.sessions_held} sub={`${t.sessions_cancelled} cancelled (${t.cancellation_rate}%)`} />
        <Stat label="Attendance" value={t.attendance_rate == null ? '—' : `${t.attendance_rate}%`} sub="of enrolled students" />
        <Stat label={isAdmin ? 'Teachers' : 'Courses'} value={isAdmin ? t.teachers : t.courses} sub={isAdmin ? `${t.courses} courses` : undefined} />
      </section>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold">{isAdmin ? 'Hours by teacher' : 'Progress by course'}</h2>
            {isAdmin ? (
              <div className="flex gap-3 text-xs text-ink/65">
                <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-board" />Earlier</span>
                <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-sun" />This month</span>
                <span>One tick = 10 h</span>
              </div>
            ) : <span className="text-xs text-ink/65">Hours held against planned hours</span>}
          </div>
          <Ledger data={data} isAdmin={isAdmin} />
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold">Hours per week</h2>
          <WeeklyBars weekly={data.weekly} />
          {isAdmin && data.by_department?.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-2 text-base font-bold">By department</h3>
              <ul className="divide-y divide-line text-sm">
                {data.by_department.map((d) => (
                  <li key={d.name} className="flex justify-between py-2"><span>{d.name}</span><span className="tabular font-semibold">{fmtH(d.hours)}</span></li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-xl font-bold">Needs attention</h2>
          {nothingToFlag ? (
            <Empty>Nothing to flag. Attendance is healthy and every course has met in the last two weeks.</Empty>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {attention.low_attendance.map((s) => (
                <li key={`a${s.id}`} className="py-2.5">
                  <span className="font-medium">{s.course_code}</span> had {s.students_present} of {s.students_enrolled} students on {fmtDate(s.session_date)}
                  <span className="ml-2 font-semibold text-brick">{Math.round((100 * s.students_present) / s.students_enrolled)}%</span>
                  {isAdmin && <div className="text-xs text-ink/60">{s.teacher_name}</div>}
                </li>
              ))}
              {attention.quiet_courses.map((c) => (
                <li key={`q${c.id}`} className="py-2.5">
                  <span className="font-medium">{c.code}</span> {c.last_session ? `has not met since ${fmtDate(c.last_session)}` : 'has no sessions logged'}
                  {isAdmin && <div className="text-xs text-ink/60">{c.teacher_name}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-xl font-bold">Latest sessions</h2>
          {data.recent.length === 0 ? (
            <Empty>No sessions yet. Log your first lecture to start the count.</Empty>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {data.recent.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate"><span className="font-medium">{s.course_code}</span> {s.topic && <span className="text-ink/65">· {s.topic}</span>}</div>
                    <div className="text-xs text-ink/60">{fmtDate(s.session_date)}, {s.start_time}–{s.end_time}{isAdmin && ` · ${s.teacher_name}`}</div>
                  </div>
                  <div className="flex items-center gap-3"><StatusPill status={s.status} /><span className="tabular w-12 text-right font-semibold">{fmtH(s.hours)}</span></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

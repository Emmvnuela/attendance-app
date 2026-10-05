import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Drawer from '../components/Drawer.jsx';
import { Button, Empty, ErrorNote, Field, StatusPill, fmtDate, fmtH, inputCls } from '../components/ui.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const blank = () => ({ course_id: '', session_date: today(), start_time: '08:00', end_time: '10:00', status: 'held', topic: '', notes: '', students_present: '', students_enrolled: '' });
const num = (v) => (v === '' || v == null ? null : Number(v));

export default function Sessions() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [filters, setFilters] = useState({ from: '', to: '', course_id: '', status: '', teacher_id: '' });
  const [data, setData] = useState({ rows: [], total: 0, held_hours: 0 });
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState(null); // { id?, form }
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    api(`/sessions?${qs}`).then(setData).catch((e) => setError(e.message));
  }, [filters]);

  useEffect(load, [load]);
  useEffect(() => {
    api('/courses').then(setCourses).catch((e) => setError(e.message));
    if (isAdmin) api('/teachers').then(setTeachers).catch(() => {});
  }, [isAdmin]);

  const setF = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });
  const setForm = (k) => (e) => setDrawer({ ...drawer, form: { ...drawer.form, [k]: e.target.value } });
  const openNew = () => { setFormError(''); setDrawer({ form: blank() }); };
  const openEdit = (s) => {
    setFormError('');
    setDrawer({ id: s.id, form: { course_id: s.course_id, session_date: s.session_date, start_time: s.start_time, end_time: s.end_time, status: s.status,
      topic: s.topic || '', notes: s.notes || '', students_present: s.students_present ?? '', students_enrolled: s.students_enrolled ?? '' } });
  };

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    const f = drawer.form;
    const body = { ...f, course_id: Number(f.course_id), topic: f.topic || null, notes: f.notes || null,
      students_present: num(f.students_present), students_enrolled: num(f.students_enrolled) };
    try {
      await api(drawer.id ? `/sessions/${drawer.id}` : '/sessions', { method: drawer.id ? 'PUT' : 'POST', body });
      setDrawer(null);
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(s) {
    if (!window.confirm(`Delete the ${s.course_code} session on ${fmtDate(s.session_date)}? This cannot be undone.`)) return;
    try { await api(`/sessions/${s.id}`, { method: 'DELETE' }); load(); } catch (err) { setError(err.message); }
  }

  const f = drawer?.form;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Sessions</h1>
          <p className="text-sm text-ink/65"><span className="tabular font-semibold text-ink">{fmtH(data.held_hours)}</span> held across {data.total} sessions in this view</p>
        </div>
        <Button variant="sun" onClick={openNew} disabled={!courses.length}>Log a session</Button>
      </header>

      <ErrorNote>{error}</ErrorNote>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Field label="From"><input type="date" className={inputCls} value={filters.from} onChange={setF('from')} /></Field>
        <Field label="To"><input type="date" className={inputCls} value={filters.to} onChange={setF('to')} /></Field>
        <Field label="Course">
          <select className={inputCls} value={filters.course_id} onChange={setF('course_id')}>
            <option value="">All courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputCls} value={filters.status} onChange={setF('status')}>
            <option value="">All</option><option value="held">Held</option><option value="cancelled">Cancelled</option><option value="scheduled">Scheduled</option>
          </select>
        </Field>
        {isAdmin && (
          <Field label="Teacher">
            <select className={inputCls} value={filters.teacher_id} onChange={setF('teacher_id')}>
              <option value="">All teachers</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
        )}
      </div>

      {data.rows.length === 0 ? (
        <Empty>{courses.length ? 'No sessions match these filters. Log a session or widen the dates.' : 'You have no courses yet. An administrator needs to assign one before you can log sessions.'}</Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-ink/65">
              <tr>
                <th className="px-4 py-2.5 font-medium">Date</th><th className="px-4 py-2.5 font-medium">Course</th>
                {isAdmin && <th className="px-4 py-2.5 font-medium">Teacher</th>}
                <th className="px-4 py-2.5 font-medium">Time</th><th className="px-4 py-2.5 text-right font-medium">Hours</th>
                <th className="px-4 py-2.5 font-medium">Attendance</th><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.rows.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2.5">{fmtDate(s.session_date)}</td>
                  <td className="px-4 py-2.5"><div className="font-medium">{s.course_code}</div><div className="text-xs text-ink/60">{s.topic || s.course_title}</div></td>
                  {isAdmin && <td className="px-4 py-2.5">{s.teacher_name}</td>}
                  <td className="tabular px-4 py-2.5">{s.start_time}–{s.end_time}</td>
                  <td className="tabular px-4 py-2.5 text-right font-semibold">{s.hours}</td>
                  <td className="tabular px-4 py-2.5">{s.students_enrolled ? `${s.students_present ?? '–'} / ${s.students_enrolled}` : '—'}</td>
                  <td className="px-4 py-2.5"><StatusPill status={s.status} /></td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <button className="mr-3 font-medium text-board underline" onClick={() => openEdit(s)}>Edit</button>
                    <button className="font-medium text-brick underline" onClick={() => remove(s)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={Boolean(drawer)} title={drawer?.id ? 'Edit session' : 'Log a session'} onClose={() => setDrawer(null)}>
        {f && (
          <form onSubmit={save} className="space-y-4">
            <ErrorNote>{formError}</ErrorNote>
            <Field label="Course">
              <select className={inputCls} value={f.course_id} onChange={setForm('course_id')} required>
                <option value="" disabled>Choose a course</option>
                {courses.filter((c) => c.teacher_id).map((c) => <option key={c.id} value={c.id}>{c.code} · {c.title}{isAdmin && c.teacher_name ? ` (${c.teacher_name})` : ''}</option>)}
              </select>
            </Field>
            <Field label="Date"><input type="date" className={inputCls} value={f.session_date} onChange={setForm('session_date')} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts"><input type="time" className={inputCls} value={f.start_time} onChange={setForm('start_time')} required /></Field>
              <Field label="Ends"><input type="time" className={inputCls} value={f.end_time} onChange={setForm('end_time')} required /></Field>
            </div>
            <Field label="Status">
              <select className={inputCls} value={f.status} onChange={setForm('status')}>
                <option value="held">Held</option><option value="cancelled">Cancelled</option><option value="scheduled">Scheduled</option>
              </select>
            </Field>
            {f.status === 'held' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Students present"><input type="number" min="0" className={inputCls} value={f.students_present} onChange={setForm('students_present')} /></Field>
                <Field label="Students enrolled"><input type="number" min="0" className={inputCls} value={f.students_enrolled} onChange={setForm('students_enrolled')} /></Field>
              </div>
            )}
            <Field label="Topic"><input className={inputCls} value={f.topic} onChange={setForm('topic')} maxLength={200} /></Field>
            <Field label="Notes"><textarea rows={3} className={inputCls} value={f.notes} onChange={setForm('notes')} maxLength={2000} /></Field>
            <Button type="submit" disabled={busy} className="w-full">{busy ? 'Saving…' : drawer.id ? 'Save changes' : 'Log session'}</Button>
          </form>
        )}
      </Drawer>
    </div>
  );
}

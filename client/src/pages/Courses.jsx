import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Drawer from '../components/Drawer.jsx';
import { Button, Empty, ErrorNote, Field, fmtH, inputCls } from '../components/ui.jsx';

const blank = { code: '', title: '', department_id: '', teacher_id: '', planned_hours: '30' };

export default function Courses() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api('/courses').then(setCourses).catch((e) => setError(e.message)), []);
  useEffect(() => {
    load();
    api('/departments').then(setDepartments).catch(() => {});
    if (isAdmin) api('/teachers').then(setTeachers).catch(() => {});
  }, [load, isAdmin]);

  const setForm = (k) => (e) => setDrawer({ ...drawer, form: { ...drawer.form, [k]: e.target.value } });
  const openNew = () => { setFormError(''); setDrawer({ form: { ...blank } }); };
  const openEdit = (c) => { setFormError(''); setDrawer({ id: c.id, form: { code: c.code, title: c.title, department_id: c.department_id ?? '', teacher_id: c.teacher_id ?? '', planned_hours: String(c.planned_hours) } }); };

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    const f = drawer.form;
    const body = { code: f.code, title: f.title, planned_hours: Number(f.planned_hours),
      department_id: f.department_id ? Number(f.department_id) : null, teacher_id: f.teacher_id ? Number(f.teacher_id) : null };
    try {
      await api(drawer.id ? `/courses/${drawer.id}` : '/courses', { method: drawer.id ? 'PUT' : 'POST', body });
      setDrawer(null);
      load();
    } catch (err) { setFormError(err.message); } finally { setBusy(false); }
  }

  async function remove(c) {
    if (!window.confirm(`Delete ${c.code}? All of its logged sessions will be deleted too.`)) return;
    try { await api(`/courses/${c.id}`, { method: 'DELETE' }); load(); } catch (err) { setError(err.message); }
  }

  const f = drawer?.form;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-sm text-ink/65">Hours held so far against the hours planned for each course.</p>
        </div>
        {isAdmin && <Button onClick={openNew}>Add a course</Button>}
      </header>
      <ErrorNote>{error}</ErrorNote>

      {courses.length === 0 ? (
        <Empty>{isAdmin ? 'No courses yet. Add the first one and assign a teacher.' : 'No courses are assigned to you yet.'}</Empty>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-white">
          {courses.map((c, i) => {
            const pct = Math.min((c.held_hours / c.planned_hours) * 100, 100);
            return (
              <li key={c.id} className="grid gap-2 px-4 py-3 md:grid-cols-[1.4fr_1.2fr_auto] md:items-center md:gap-6">
                <div>
                  <div className="font-medium">{c.code} <span className="font-normal text-ink/70">· {c.title}</span></div>
                  <div className="text-xs text-ink/60">{c.teacher_name || 'No teacher assigned'}{c.department_name && ` · ${c.department_name}`}</div>
                </div>
                <div>
                  <div className="h-2.5 w-full overflow-hidden rounded-sm bg-line/60">
                    <motion.div className={`h-full ${pct >= 100 ? 'bg-moss' : 'bg-board'}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: i * 0.04 }} />
                  </div>
                  <div className="tabular mt-1 text-xs text-ink/70">{fmtH(c.held_hours)} of {c.planned_hours} h</div>
                </div>
                {isAdmin && (
                  <div className="whitespace-nowrap text-sm">
                    <button className="mr-3 font-medium text-board underline" onClick={() => openEdit(c)}>Edit</button>
                    <button className="font-medium text-brick underline" onClick={() => remove(c)}>Delete</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Drawer open={Boolean(drawer)} title={drawer?.id ? 'Edit course' : 'Add a course'} onClose={() => setDrawer(null)}>
        {f && (
          <form onSubmit={save} className="space-y-4">
            <ErrorNote>{formError}</ErrorNote>
            <Field label="Course code"><input className={inputCls} value={f.code} onChange={setForm('code')} maxLength={20} required /></Field>
            <Field label="Title"><input className={inputCls} value={f.title} onChange={setForm('title')} maxLength={150} required /></Field>
            <Field label="Teacher">
              <select className={inputCls} value={f.teacher_id} onChange={setForm('teacher_id')}>
                <option value="">Not assigned</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Department">
              <select className={inputCls} value={f.department_id} onChange={setForm('department_id')}>
                <option value="">None</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Planned hours"><input type="number" min="1" step="0.5" className={inputCls} value={f.planned_hours} onChange={setForm('planned_hours')} required /></Field>
            <Button type="submit" disabled={busy} className="w-full">{busy ? 'Saving…' : drawer.id ? 'Save changes' : 'Add course'}</Button>
          </form>
        )}
      </Drawer>
    </div>
  );
}

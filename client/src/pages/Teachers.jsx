import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Drawer from '../components/Drawer.jsx';
import { Button, Empty, ErrorNote, Field, fmtH, inputCls } from '../components/ui.jsx';

const blank = { name: '', email: '', password: '', department_id: '', weekly_target_hours: '12' };

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api('/teachers').then(setTeachers).catch((e) => setError(e.message)), []);
  useEffect(() => {
    load();
    api('/departments').then(setDepartments).catch(() => {});
  }, [load]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      await api('/teachers', { method: 'POST', body: { ...form, department_id: form.department_id ? Number(form.department_id) : null, weekly_target_hours: Number(form.weekly_target_hours) } });
      setForm(null);
      load();
    } catch (err) { setFormError(err.message); } finally { setBusy(false); }
  }

  async function remove(t) {
    if (!window.confirm(`Delete ${t.name}? Their logged sessions will be deleted too.`)) return;
    try { await api(`/teachers/${t.id}`, { method: 'DELETE' }); load(); } catch (err) { setError(err.message); }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Teachers</h1>
          <p className="text-sm text-ink/65">Cumulative teaching hours for every teacher.</p>
        </div>
        <Button onClick={() => { setFormError(''); setForm({ ...blank }); }}>Add a teacher</Button>
      </header>
      <ErrorNote>{error}</ErrorNote>

      {teachers.length === 0 ? (
        <Empty>No teachers yet. Add one, or ask them to create an account from the sign-in page.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-ink/65">
              <tr>
                <th className="px-4 py-2.5 font-medium">Teacher</th><th className="px-4 py-2.5 font-medium">Department</th>
                <th className="px-4 py-2.5 text-right font-medium">Hours taught</th><th className="px-4 py-2.5 text-right font-medium">Sessions held</th>
                <th className="px-4 py-2.5 text-right font-medium">Cancelled</th><th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2.5"><div className="font-medium">{t.name}</div><div className="text-xs text-ink/60">{t.email}</div></td>
                  <td className="px-4 py-2.5">{t.department_name || '—'}</td>
                  <td className="tabular px-4 py-2.5 text-right font-semibold">{fmtH(t.total_hours)}</td>
                  <td className="tabular px-4 py-2.5 text-right">{t.sessions_held}</td>
                  <td className="tabular px-4 py-2.5 text-right">{t.sessions_cancelled}</td>
                  <td className="px-4 py-2.5 text-right"><button className="font-medium text-brick underline" onClick={() => remove(t)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer open={Boolean(form)} title="Add a teacher" onClose={() => setForm(null)}>
        {form && (
          <form onSubmit={save} className="space-y-4">
            <ErrorNote>{formError}</ErrorNote>
            <Field label="Full name"><input className={inputCls} value={form.name} onChange={set('name')} required /></Field>
            <Field label="Email"><input type="email" className={inputCls} value={form.email} onChange={set('email')} required /></Field>
            <Field label="Temporary password" hint="Use at least 8 characters. Share it with the teacher securely."><input type="password" className={inputCls} value={form.password} onChange={set('password')} minLength={8} required autoComplete="new-password" /></Field>
            <Field label="Department">
              <select className={inputCls} value={form.department_id} onChange={set('department_id')}>
                <option value="">None</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Weekly target hours"><input type="number" min="0" max="80" step="0.5" className={inputCls} value={form.weekly_target_hours} onChange={set('weekly_target_hours')} /></Field>
            <Button type="submit" disabled={busy} className="w-full">{busy ? 'Saving…' : 'Add teacher'}</Button>
          </form>
        )}
      </Drawer>
    </div>
  );
}

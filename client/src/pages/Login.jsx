import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../auth.jsx';
import { Button, ErrorNote, Field, inputCls } from '../components/ui.jsx';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <section className="flex flex-col justify-between bg-board p-8 text-white md:p-14">
        <div className="font-display text-xl font-bold">Lecture Ledger</div>
        <div>
          <h1 className="max-w-md text-4xl font-bold leading-tight md:text-5xl">Log each lecture. See every hour you teach.</h1>
          <p className="mt-4 max-w-sm text-white/75">
            Teachers record sessions and attendance in under a minute. Administrators see hours, attendance and gaps across the school.
          </p>
        </div>
        <motion.div
          aria-hidden="true"
          className="h-3 rounded-sm"
          style={{ background: 'repeating-linear-gradient(to right, #E9B300 0 2px, transparent 2px 14px)' }}
          initial={{ scaleX: 0, originX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}
        />
      </section>

      <section className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h2 className="text-2xl font-bold">{mode === 'login' ? 'Sign in' : 'Create a teacher account'}</h2>
          <ErrorNote>{error}</ErrorNote>
          {mode === 'register' && (
            <Field label="Full name"><input className={inputCls} value={form.name} onChange={set('name')} autoComplete="name" required /></Field>
          )}
          <Field label="Email"><input type="email" className={inputCls} value={form.email} onChange={set('email')} autoComplete="email" required /></Field>
          <Field label="Password" hint={mode === 'register' ? 'Use at least 8 characters.' : undefined}>
            <input type="password" className={inputCls} value={form.password} onChange={set('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 8 : undefined} required />
          </Field>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
          <p className="text-sm text-ink/70">
            {mode === 'login' ? 'New teacher?' : 'Already have an account?'}{' '}
            <button type="button" className="font-semibold text-board underline" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}

import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const linkCls = ({ isActive }) =>
  `whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white'
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const isAdmin = user.role === 'admin';
  return (
    <div className="min-h-screen md:flex">
      <aside className="flex flex-col gap-4 bg-board p-4 md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:p-5">
        <div className="font-display text-xl font-bold text-white">Lecture Ledger</div>
        <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Main">
          <NavLink to="/" end className={linkCls}>Overview</NavLink>
          <NavLink to="/sessions" className={linkCls}>Sessions</NavLink>
          <NavLink to="/courses" className={linkCls}>Courses</NavLink>
          {isAdmin && <NavLink to="/teachers" className={linkCls}>Teachers</NavLink>}
        </nav>
        <div className="mt-auto hidden text-sm text-white/80 md:block">
          <div className="font-medium text-white">{user.name}</div>
          <div className="mb-2 capitalize">{user.role}</div>
          <button onClick={logout} className="underline underline-offset-2 hover:text-white">Sign out</button>
        </div>
        <button onClick={logout} className="self-start text-sm text-white/80 underline md:hidden">Sign out</button>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-9">
        <div className="mx-auto max-w-6xl"><Outlet /></div>
      </main>
    </div>
  );
}

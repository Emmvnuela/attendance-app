export const inputCls =
  'w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-board focus:outline-none';

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/60">{hint}</span>}
    </label>
  );
}

const variants = {
  primary: 'bg-board text-white hover:bg-[#2a4d44]',
  sun: 'bg-sun text-ink hover:bg-[#f2c01f]',
  ghost: 'border border-line bg-white text-ink hover:border-board',
  danger: 'border border-brick/40 bg-white text-brick hover:bg-brick hover:text-white',
};

export function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}

const pill = {
  held: 'bg-moss/15 text-moss',
  cancelled: 'bg-brick/15 text-brick',
  scheduled: 'bg-sun/25 text-[#7a5d00]',
};
export const StatusPill = ({ status }) => (
  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${pill[status]}`}>{status}</span>
);

export const fmtH = (n) => `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} h`;
export const fmtDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export const ErrorNote = ({ children }) =>
  children ? (
    <p role="alert" className="rounded-md border border-brick/30 bg-brick/10 px-3 py-2 text-sm text-brick">
      {children}
    </p>
  ) : null;

export const Empty = ({ children }) => (
  <p className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-ink/60">{children}</p>
);

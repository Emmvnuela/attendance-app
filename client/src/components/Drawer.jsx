import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Drawer({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink/40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog" aria-modal="true" aria-label={title}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-paper"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
          >
            <header className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="text-xl font-bold">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="rounded p-1 text-2xl leading-none text-ink/60 hover:text-ink">×</button>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

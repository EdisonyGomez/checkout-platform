import type { ReactNode } from 'react';

export default function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

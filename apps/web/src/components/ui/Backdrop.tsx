import type { ReactNode } from 'react';

export default function Backdrop({
  open,
  header,
  children,
}: {
  open: boolean;
  header: ReactNode;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/40">
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 shadow-2xl">
        <div className="mb-3">{header}</div>
        {children}
      </div>
    </div>
  );
}

import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export default function Input({ label, hint, error, className = '', ...props }: Props) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-slate-700">{label}</div>
      <input
        className={`h-11 w-full rounded-xl border px-3 text-sm outline-none transition
        ${error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'}
        ${className}`}
        {...props}
      />
      {error ? (
        <div className="mt-1 text-xs text-red-600">{error}</div>
      ) : hint ? (
        <div className="mt-1 text-xs text-slate-500">{hint}</div>
      ) : null}
    </label>
  );
}

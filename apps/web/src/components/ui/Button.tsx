import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  full?: boolean;
};

export default function Button({
  variant = 'primary',
  full = true,
  className = '',
  ...props
}: Props) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ' +
    'focus:outline-none focus:ring-2 focus:ring-slate-400 active:scale-[0.99] ' +
    'disabled:opacity-50 disabled:cursor-not-allowed';

  const width = full ? 'w-full' : '';

  const styles =
    variant === 'primary'
      ? 'bg-slate-900 text-white hover:bg-slate-800'
      : variant === 'secondary'
        ? 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50'
        : variant === 'danger'
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-transparent text-slate-700 hover:bg-slate-100';

  return <button className={`${base} ${width} ${styles} ${className}`} {...props} />;
}

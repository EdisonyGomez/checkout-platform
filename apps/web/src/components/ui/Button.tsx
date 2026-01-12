import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

export default function Button({ variant = 'primary', className = '', ...props }: Props) {
  const base =
    'h-11 rounded-xl px-4 font-semibold text-sm transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed';

  const styles =
    variant === 'primary'
      ? 'bg-slate-900 text-white hover:bg-slate-800'
      : variant === 'secondary'
        ? 'bg-slate-100 text-slate-900 hover:bg-slate-200'
        : variant === 'danger'
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-transparent text-slate-700 hover:bg-slate-100';

  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

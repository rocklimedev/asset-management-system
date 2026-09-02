import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }: ButtonProps) {
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600',
    secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-brand-600',
    ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:outline-brand-600',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-600',
  }[variant];
  const sizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-3.5 py-2 text-sm' }[size];

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none',
        variants, sizes, className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

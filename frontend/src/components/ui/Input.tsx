import { clsx } from 'clsx';
import React from 'react';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={clsx(
        'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400',
        'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...rest }, ref) => (
    <select
      ref={ref}
      className={clsx(
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900',
        'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => (
    <textarea
      ref={ref}
      className={clsx(
        'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400',
        'focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100',
        className,
      )}
      {...rest}
    />
  ),
);
Textarea.displayName = 'Textarea';

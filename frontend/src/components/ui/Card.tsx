import { clsx } from 'clsx';
import React from 'react';

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('rounded-xl border border-slate-200 bg-white', className)} {...rest}>
      {children}
    </div>
  );
}

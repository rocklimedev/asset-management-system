import { clsx } from 'clsx';
import type { AssetStatus, EmployeeStatus } from '../../types';

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  ASSIGNED: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  REPAIR: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  LOST: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  DAMAGED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  RETIRED: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  DISPOSED: 'bg-slate-100 text-slate-500 ring-slate-500/20',
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  ON_LEAVE: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  INACTIVE: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  EXITED: 'bg-slate-100 text-slate-500 ring-slate-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Available',
  ASSIGNED: 'Assigned',
  REPAIR: 'Under repair',
  LOST: 'Lost',
  DAMAGED: 'Damaged',
  RETIRED: 'Retired',
  DISPOSED: 'Disposed',
  ACTIVE: 'Active',
  ON_LEAVE: 'On leave',
  INACTIVE: 'Inactive',
  EXITED: 'Exited',
};

export function StatusBadge({ status }: { status: AssetStatus | EmployeeStatus | string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600 ring-slate-500/20',
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'brand' | 'warn' | 'danger' }) {
  const styles = {
    neutral: 'bg-slate-100 text-slate-600',
    brand: 'bg-brand-50 text-brand-700',
    warn: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
  }[tone];
  return <span className={clsx('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', styles)}>{children}</span>;
}

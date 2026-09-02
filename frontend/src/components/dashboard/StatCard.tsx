import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

export function StatCard({
  label, value, icon: Icon, tone = 'default',
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: 'default' | 'warn' | 'danger';
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <div
          className={clsx(
            'flex h-7 w-7 items-center justify-center rounded-lg',
            tone === 'warn' && 'bg-amber-50 text-amber-600',
            tone === 'danger' && 'bg-rose-50 text-rose-600',
            tone === 'default' && 'bg-brand-50 text-brand-600',
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className="text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

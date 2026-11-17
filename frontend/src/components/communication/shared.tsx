import { Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { Channel } from '@/services/api/communication.api';

export function errorMessage(error: unknown): string {
  const data = (error as { data?: { message?: string | string[] } })?.data?.message;
  return Array.isArray(data)
    ? data.join(' ')
    : data || 'Request failed. Check your permissions and Zoho connection, then try again.';
}

export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <p role="alert" className="rounded-xl border border-destructive p-3 text-sm text-destructive">
      {typeof error === 'string' ? error : errorMessage(error)}
    </p>
  ) : null;
}

export type StatusTone = 'success' | 'warning' | 'danger' | 'active' | 'neutral';

/** Maps workflow / connector states to one colour family so the whole section agrees. */
export function statusTone(value?: string): StatusTone {
  const v = (value || '').toUpperCase();
  if (['COMPLETED', 'ACTIVE', 'CONNECTED', 'VERIFIED', 'HEALTHY'].includes(v)) return 'success';
  if (['REQUIRES_MANUAL_ACTION', 'PENDING', 'REQUIRES_RECONCILIATION'].includes(v))
    return 'warning';
  if (['FAILED', 'ERROR', 'INACTIVE', 'EXITED', 'UNHEALTHY', 'CANCELLED'].includes(v))
    return 'danger';
  if (['IN_PROGRESS', 'RUNNING', 'PROVISIONING'].includes(v)) return 'active';
  return 'neutral';
}

const toneClasses: Record<StatusTone, string> = {
  success: 'bg-success-muted text-success-strong',
  warning: 'bg-warning-muted text-warning-strong',
  danger: 'bg-destructive-muted text-destructive-strong',
  active: 'bg-primary-muted text-primary-strong',
  neutral: 'bg-muted text-muted-foreground',
};

const dotClasses: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  active: 'bg-primary',
  neutral: 'bg-muted-foreground',
};

export function Status({ value }: { value?: string }) {
  const tone = statusTone(value);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        toneClasses[tone],
      )}
    >
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', dotClasses[tone])} />
      {(value || 'NOT STARTED').replace(/_/g, ' ')}
    </span>
  );
}

export function SearchPill({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <label className="relative flex w-full max-w-xl items-center">
      <span className="sr-only">{label}</span>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-4 h-4 w-4 text-muted-foreground"
      />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-full border border-input bg-card pl-11 pr-4 text-sm shadow-sm transition-shadow placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-md"
      />
    </label>
  );
}

export function ChannelPicker({
  channels,
  value,
  onChange,
  disabled,
}: {
  channels: Channel[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="max-h-52 space-y-2 overflow-auto rounded-xl border p-3">
      {!channels.length && (
        <p className="text-sm text-muted-foreground">
          Sync the channel directory to load channels.
        </p>
      )}
      {channels.map((c) => (
        <label key={c.id} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value.includes(c.id)}
            disabled={disabled || (!c.isActive && !value.includes(c.id))}
            onCheckedChange={(checked) =>
              onChange(checked ? [...value, c.id] : value.filter((id) => id !== c.id))
            }
          />
          {c.channelName}
          {!c.isActive && ' (inactive)'}
        </label>
      ))}
    </div>
  );
}

export const selectClass =
  'h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

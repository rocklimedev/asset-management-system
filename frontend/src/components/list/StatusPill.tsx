import { cn } from '@/lib/utils';

export type PillTone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

const PILL: Record<PillTone, string> = {
  ok: 'border-success-border bg-success-muted text-success-strong',
  warn: 'border-warning-border bg-warning-muted text-warning-strong',
  danger: 'border-destructive-border bg-destructive-muted text-destructive-strong',
  info: 'border-info-border bg-info-muted text-info-strong',
  neutral: 'border-border bg-muted text-muted-foreground',
};

const DOT: Record<PillTone, string> = {
  ok: 'bg-success',
  warn: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
  neutral: 'bg-muted-foreground',
};

/**
 * Status in a table cell: a bordered pill with a coloured dot.
 * The label carries the meaning; colour only reinforces it.
 */
export function StatusPill({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: PillTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium',
        PILL[tone],
        className,
      )}
    >
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', DOT[tone])} />
      {children}
    </span>
  );
}

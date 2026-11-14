import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';

import { cn } from '@/lib/utils';

type Tone = 'default' | 'brand' | 'ok' | 'warn' | 'danger' | 'info';

// Icon tile colours. The tile is the only colour on a neutral card, so a
// tone is visible at a glance without tinting the whole card.
const TILE_CLASSES: Record<Tone, string> = {
  default: 'border-border bg-muted text-muted-foreground',
  brand: 'border-primary-border bg-primary-muted text-primary',
  ok: 'border-success-border bg-success-muted text-success-strong',
  warn: 'border-warning-border bg-warning-muted text-warning-strong',
  danger: 'border-destructive-border bg-destructive-muted text-destructive-strong',
  info: 'border-info-border bg-info-muted text-info-strong',
};

/**
 * Headline metric. Icon tile, label, large figure. When `to` is set the
 * whole card is a link and shows an arrow, so it is clear it can be opened.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  hint,
  delta,
  to,
  className,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: Tone | 'warn' | 'danger';
  hint?: string;
  /** Percentage change vs. the previous period. */
  delta?: number;
  /** Where the number leads. Makes the whole card a link. */
  to?: string;
  className?: string;
}) {
  const resolvedTone = (TILE_CLASSES[tone as Tone] ? tone : 'default') as Tone;
  const deltaUp = typeof delta === 'number' && delta >= 0;

  const card = (
    <div
      className={cn(
        'flex h-full flex-col gap-5 rounded-xl border border-border bg-card p-5 shadow-card',
        to &&
          'transition-colors group-hover:border-primary-border group-focus-visible:border-primary-border',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
            TILE_CLASSES[resolvedTone],
          )}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>

        {to && (
          <ArrowUpRight
            className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary"
            aria-hidden="true"
          />
        )}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>

        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {value}
          </p>

          {typeof delta === 'number' && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
                deltaUp ? 'text-success-strong' : 'text-destructive-strong',
              )}
            >
              {deltaUp ? (
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
              ) : (
                <TrendingDown className="h-3 w-3" aria-hidden="true" />
              )}
              {Math.abs(delta)}%
            </span>
          )}
        </div>

        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );

  if (!to) return card;

  return (
    <Link
      to={to}
      className="group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {card}
    </Link>
  );
}

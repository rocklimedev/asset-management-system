import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ============================================================
// PAGE HEADER
// One consistent title, description and action area for every
// screen, so users always know where they are and what to do.
// ============================================================

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Primary and secondary actions, rendered right-aligned on wide screens. */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>

        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
    </div>
  );
}

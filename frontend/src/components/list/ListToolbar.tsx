import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';

/**
 * Toolbar above a table: title and count on the first line, then search,
 * filters on the left and actions on the right. Everything a user needs to
 * narrow a list sits in one place, above the rows it affects.
 */
export function ListToolbar({
  title,
  count,
  search,
  onSearchChange,
  searchPlaceholder = 'Search',
  filters,
  actions,
  className,
}: {
  title?: string;
  count?: number;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3 border-b border-border p-4', className)}>
      {(title || count !== undefined) && (
        <div className="flex items-center gap-2">
          {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}

          {count !== undefined && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {onSearchChange && (
          <div className="relative w-full sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />

            <Input
              type="search"
              value={search ?? ''}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-9 rounded-full pl-9"
            />
          </div>
        )}

        {filters}

        {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const SELECT =
  'h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Page numbers with ellipses, e.g. 1 … 4 5 6 … 12. */
function pageItems(current: number, last: number): (number | '…')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

  const items: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(last - 1, current + 1);

  if (start > 2) items.push('…');
  for (let p = start; p <= end; p++) items.push(p);
  if (end < last - 1) items.push('…');
  items.push(last);

  return items;
}

const NAV =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40';

/**
 * Footer for a paged table: "from–to of total", rows-per-page when the
 * list supports it, and first / previous / numbers / next / last.
 */
export function TablePagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  noun = 'rows',
  rowsPerPage,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 15, 25, 50],
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  noun?: string;
  rowsPerPage?: number;
  onRowsPerPageChange?: (size: number) => void;
  rowsPerPageOptions?: number[];
}) {
  const last = Math.max(totalPages, 1);
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
        {onRowsPerPageChange && rowsPerPage && (
          <label className="flex items-center gap-2">
            Rows per page
            <select
              value={rowsPerPage}
              onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
              className={SELECT}
            >
              {rowsPerPageOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        <span className="tabular-nums">
          {from}–{to} of {total} {noun}
        </span>
      </div>

      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button
          type="button"
          className={NAV}
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={NAV}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        {pageItems(page, last).map((item, index) =>
          item === '…' ? (
            <span key={`gap-${index}`} className="px-1 text-muted-foreground" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              className={cn(
                'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring',
                item === page
                  ? 'border border-primary-border bg-primary-muted text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          className={NAV}
          disabled={page >= last}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          className={NAV}
          disabled={page >= last}
          onClick={() => onPageChange(last)}
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Shared chrome for every chart on the Reports page: title, optional
 * description, an actions slot, and a fixed-height plot area.
 */
export function ChartFrame({
  title,
  description,
  actions,
  height = 280,
  className,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  height?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card shadow-card",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </h2>

          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="shrink-0">{actions}</div>}
      </header>

      <div className="px-2 py-4" style={{ height }}>
        {children}
      </div>
    </section>
  );
}

/**
 * Solid tooltip surface for Recharts — opaque card, no blur.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string | number;
  formatter?: (value: number | string, name?: string) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[10rem] rounded-lg border border-border bg-popover p-2.5 text-popover-foreground shadow-overlay">
      {label !== undefined && (
        <p className="mb-1.5 text-xs font-semibold text-foreground">{label}</p>
      )}

      <ul className="space-y-1">
        {payload.map((entry, index) => (
          <li
            key={index}
            className="flex items-center justify-between gap-4 text-xs"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>

            <span className="font-medium tabular-nums text-foreground">
              {formatter && entry.value !== undefined
                ? formatter(entry.value, entry.name)
                : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChartLegend({
  items,
}: {
  items: Array<{ label: string; color: string }>;
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-[2px]"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

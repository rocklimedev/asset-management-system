import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "default" | "brand" | "ok" | "warn" | "danger" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  default: "bg-accent text-accent-foreground",
  brand: "bg-primary-muted text-primary",
  ok: "bg-success-muted text-success-strong",
  warn: "bg-warning-muted text-warning-strong",
  danger: "bg-destructive-muted text-destructive-strong",
  info: "bg-info-muted text-info-strong",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
  delta,
  className,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: Tone | "warn" | "danger";
  hint?: string;
  /** Percentage change vs. the previous period. */
  delta?: number;
  className?: string;
}) {
  const resolvedTone = (TONE_CLASSES[tone as Tone] ? tone : "default") as Tone;

  const deltaUp = typeof delta === "number" && delta >= 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-card",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>

        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            TONE_CLASSES[resolvedTone],
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </p>

        {typeof delta === "number" && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
              deltaUp ? "text-success-strong" : "text-destructive-strong",
            )}
          >
            {deltaUp ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(delta)}%
          </span>
        )}
      </div>

      {hint && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

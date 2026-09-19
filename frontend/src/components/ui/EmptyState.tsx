import { Inbox } from "lucide-react";
import React from "react";

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent">
        <Icon className="h-5 w-5 text-accent-foreground" />
      </div>

      <p className="text-sm font-semibold text-foreground">{title}</p>

      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted" />

        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/3 rounded bg-muted" />
          <div className="h-2.5 w-1/2 rounded bg-muted" />
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-8 rounded bg-muted" />
        <div className="h-8 rounded bg-muted" />
      </div>
    </div>
  );
}

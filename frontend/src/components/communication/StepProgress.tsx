import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Horizontal onboarding stepper. Completed steps show a check, the current
 * step is highlighted, and upcoming steps stay quiet, so progress reads at a
 * glance (the pattern Zoho uses for staged employee onboarding).
 */
export function StepProgress({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        Step {current + 1} of {steps.length} ·{' '}
        <span className="font-medium text-foreground">{steps[current]}</span>
      </p>
      <ol aria-label="Onboarding steps" className="flex items-start gap-2 overflow-x-auto pb-1">
        {steps.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li
              key={label}
              aria-current={active ? 'step' : undefined}
              className="flex min-w-[6.5rem] flex-1 flex-col items-center gap-2 text-center"
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary bg-card text-primary ring-4 ring-primary/15',
                  !done && !active && 'border-border bg-card text-muted-foreground',
                )}
              >
                {done ? <Check className="h-4 w-4" aria-label="Completed" /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-xs leading-tight',
                  active ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

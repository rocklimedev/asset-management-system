import { Status } from './shared';

export const ONBOARDING_STAGES = [
  {
    label: 'Employee',
    description: 'Pick an active employee, or add a new hire from the New hire tab.',
  },
  {
    label: 'Channel plan',
    description:
      'Choose the Cliq channels this role should join. Profiles save this as a reusable set.',
  },
  {
    label: 'Company email',
    description: 'Create the company mailbox in Zoho Mail. The name follows your naming pattern.',
  },
  {
    label: 'Review and onboard',
    description: 'Zoho accounts are created, channels are joined, and the welcome email is sent.',
  },
  {
    label: 'Activation and activity',
    description: 'An admin confirms the secure first sign-in. Completing this closes the workflow.',
  },
] as const;

const STATUS_NOTES = [
  { value: 'COMPLETED', note: 'Zoho accepted this step. Nothing more to do.' },
  { value: 'IN_PROGRESS', note: 'Zoho is working on it. Refresh in a moment.' },
  { value: 'REQUIRES_MANUAL_ACTION', note: 'An admin needs to act in Zoho Admin Console.' },
  { value: 'FAILED', note: 'Read the error, fix the cause, then retry this step only.' },
  { value: undefined, note: 'Not run yet.' },
];

/** Zoho-style legend: what each stage means and what each status colour says. */
export function OnboardingLegend() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section aria-labelledby="stage-legend" className="rounded-2xl border bg-card p-5 shadow-sm">
        <h3 id="stage-legend" className="font-semibold">
          Onboarding stages
        </h3>
        <ol className="mt-4 space-y-4">
          {ONBOARDING_STAGES.map((stage, index) => (
            <li key={stage.label} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-muted text-xs font-semibold text-primary-strong">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{stage.label}</p>
                <p className="text-sm text-muted-foreground">{stage.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="status-legend" className="rounded-2xl border bg-card p-5 shadow-sm">
        <h3 id="status-legend" className="font-semibold">
          Status colours
        </h3>
        <dl className="mt-4 space-y-4">
          {STATUS_NOTES.map(({ value, note }) => (
            <div key={value ?? 'NOT_STARTED'} className="flex items-start gap-3">
              <dt className="shrink-0">
                <Status value={value} />
              </dt>
              <dd className="text-sm text-muted-foreground">{note}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

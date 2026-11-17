import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StepProgress } from './StepProgress';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useGetEmployeesQuery, type Employee } from '@/services/api/employees.api';
import {
  channelIds,
  useEmployeeCommunicationQuery,
  useEmployeeCommunicationLogsQuery,
  usePreviewCommunicationPlanMutation,
  useAssignCommunicationPlanMutation,
  useProvisionCommunicationMutation,
  useRemoveCommunicationMembershipMutation,
  useConfirmCommunicationActivationMutation,
  type Channel,
  type Profile,
  type PlanInput,
  type ProvisionOperation,
} from '@/services/api/communication.api';
import { ChannelPicker, ErrorNotice, Status, selectClass } from './shared';

export function EmployeeWorkspace({
  employee,
  channels,
  profiles,
  onBack,
}: {
  employee: Employee;
  channels: Channel[];
  profiles: Profile[];
  onBack: () => void;
}) {
  const status = useEmployeeCommunicationQuery(employee.id);
  const logs = useEmployeeCommunicationLogsQuery(employee.id);
  const [preview, previewState] = usePreviewCommunicationPlanMutation();
  const [assign] = useAssignCommunicationPlanMutation();
  const [provision, provisionState] = useProvisionCommunicationMutation();
  const [remove] = useRemoveCommunicationMembershipMutation();
  const [activate] = useConfirmCommunicationActivationMutation();
  const [plan, setPlan] = useState<PlanInput>({});
  const [editingPlan, setEditingPlan] = useState(false);
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [domain, setDomain] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [notice, setNotice] = useState('');
  const keys = useRef(new Map<string, string>());
  const confirm = useConfirm();
  const data = status.data;
  const nameFor = (id: string) => channels.find((c) => c.id === id)?.channelName || id;
  const execute = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    setNotice('');
    try {
      await action();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  const changePlan = (value: PlanInput) => {
    setEditingPlan(true);
    setPlan(value);
    previewState.reset();
  };
  const provisionAccount = async (operation: ProvisionOperation, step?: string) => {
    if (
      !(await confirm({
        title: operation === 'sync-channels' ? 'Sync employee channels?' : 'Run Zoho provisioning?',
        description: `This can create or update Zoho accounts and channel memberships for ${employee.name}.${operation === 'onboard' || step === 'WELCOME' ? ' It also sends a welcome email to the company mailbox.' : ''} Review the assigned plan before continuing.`,
        confirmLabel: 'Continue',
      }))
    )
      return;
    void execute(async () => {
      const intent = JSON.stringify({
        operation,
        step,
        email: email.trim(),
        domain: domain.trim(),
      });
      const key = keys.current.get(intent) || crypto.randomUUID();
      keys.current.set(intent, key);
      try {
        const result = await provision({
          employeeId: employee.id,
          operation,
          body: {
            idempotencyKey: key,
            ...(email.trim() ? { email: email.trim() } : {}),
            ...(domain.trim() ? { domain: domain.trim() } : {}),
            ...(password ? { temporaryPassword: password } : {}),
            ...(step ? { step } : {}),
          },
        }).unwrap();
        setStep(2);
        setNotice(
          `Workflow: ${(result.workflow?.status || 'PENDING').replace(/_/g, ' ')}. Review each step below.`,
        );
      } finally {
        setPassword('');
        provisionState.reset();
      }
    });
  };
  const invalidPassword = !!password && (password.length < 12 || password.length > 128);
  const invalidEmail = !!email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const invalidDomain = !!domain.trim() && !/^[a-z0-9.-]+$/.test(domain.trim());
  return (
    <div className="space-y-5" aria-busy={busy}>
      <StepProgress
        steps={[
          'Employee',
          'Channel plan',
          'Company email',
          'Review and onboard',
          'Activation and activity',
        ]}
        current={step + 1}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="font-medium">
          {employee.name} <span className="text-muted-foreground">· {employee.employeeCode}</span>
        </p>
        <Status value={data?.workflow?.status} />
      </div>
      <ErrorNotice error={error || status.error} />
      {notice && (
        <p role="status" className="rounded-lg border bg-muted p-3 text-sm">
          {notice}
        </p>
      )}
      {status.isLoading && <p role="status">Loading employee communication status…</p>}
      {data && (
        <>
          {step === 0 && (
            <>
              <Card>
                <CardHeader className="flex-col">
                  <CardTitle>Channel plan</CardTitle>
                  <CardDescription>
                    Assigning a plan saves the intended channels. Run onboarding or sync channels to
                    apply memberships in Zoho.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">
                    Profile:{' '}
                    {profiles.find((p) => p.id === data.plan?.profileId)?.name ||
                      'Custom / unassigned'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {channelIds(data.plan?.channelIds).map(nameFor).join(', ') ||
                      'No planned channels.'}
                  </p>
                  {data.plan && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setEditingPlan(!editingPlan);
                        setPlan({ addChannelIds: channelIds(data.plan?.channelIds) });
                        previewState.reset();
                      }}
                    >
                      {' '}
                      {editingPlan ? 'Close editor' : 'Edit channel plan'}
                    </Button>
                  )}
                  {(editingPlan || !data.plan) && (
                    <div className="space-y-4 rounded-lg border p-4">
                      <div className="space-y-2">
                        <Label htmlFor="comm-profile">Profile</Label>
                        <select
                          id="comm-profile"
                          className={selectClass}
                          disabled={busy}
                          value={plan.profileId || ''}
                          onChange={(e) =>
                            changePlan({
                              profileId: e.target.value || undefined,
                              addChannelIds: [],
                              removeChannelIds: [],
                            })
                          }
                        >
                          <option value="">Custom channels</option>
                          {profiles
                            .filter((p) => p.isActive)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Additional / custom channels</p>
                        <ChannelPicker
                          channels={channels}
                          disabled={busy}
                          value={plan.addChannelIds || []}
                          onChange={(ids) => changePlan({ ...plan, addChannelIds: ids })}
                        />
                      </div>
                      {plan.profileId && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Exclude channels from profile</p>
                          <ChannelPicker
                            channels={channels.filter((c) =>
                              profiles
                                .find((p) => p.id === plan.profileId)
                                ?.channelIds.includes(c.id),
                            )}
                            disabled={busy}
                            value={plan.removeChannelIds || []}
                            onChange={(ids) => changePlan({ ...plan, removeChannelIds: ids })}
                          />
                        </div>
                      )}
                      <Button
                        variant="outline"
                        disabled={busy || (plan.addChannelIds?.length || 0) > 100}
                        onClick={() =>
                          void execute(async () => {
                            await preview({ employeeId: employee.id, body: plan }).unwrap();
                          })
                        }
                      >
                        Preview plan
                      </Button>
                      {previewState.data && (
                        <div className="space-y-3">
                          <p className="text-sm">
                            Planned channels:{' '}
                            {previewState.data.channels.map((c) => c.channelName).join(', ') ||
                              'None'}
                          </p>
                          <Button
                            disabled={busy}
                            onClick={() =>
                              void execute(async () => {
                                await assign({ employeeId: employee.id, body: plan }).unwrap();
                                setEditingPlan(false);
                                previewState.reset();
                                setNotice(
                                  'Channel plan saved. Sync channels to apply the memberships.',
                                );
                              })
                            }
                          >
                            Assign this plan
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    {data.assignments.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                      >
                        <div className="space-y-1">
                          <p className="text-sm">{nameFor(a.channelId)}</p>
                          <Status value={a.status} />
                          {a.lastError && <p className="text-sm text-destructive">{a.lastError}</p>}
                        </div>
                        {a.status !== 'REMOVED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              busy || channelIds(data.plan?.channelIds).includes(a.channelId)
                            }
                            onClick={async () => {
                              if (
                                await confirm({
                                  title: 'Remove channel membership?',
                                  description: `Remove ${employee.name} from ${nameFor(a.channelId)} in Zoho Cliq?`,
                                  confirmLabel: 'Remove membership',
                                  tone: 'danger',
                                })
                              )
                                void execute(async () => {
                                  await remove({
                                    employeeId: employee.id,
                                    channelId: a.channelId,
                                  }).unwrap();
                                  setNotice('Membership removed.');
                                });
                            }}
                          >
                            Remove membership
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {!!data.assignments.length && (
                    <p className="text-xs text-muted-foreground">
                      Remove a channel from the saved plan before removing its membership.
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
          {step === 1 && (
            <>
              <Card>
                <CardHeader className="flex-col">
                  <CardTitle>Provision Zoho accounts</CardTitle>
                  <CardDescription>
                    Use the company domain configured on the server, or provide an approved domain
                    or email override. Mail creation requires a temporary password of 12–128
                    characters. Full onboarding sends a welcome email to the company mailbox with
                    sign-in guidance and team channels. Share initial credentials separately through
                    a secure channel.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="comm-email">Email override (optional)</Label>
                      <Input
                        id="comm-email"
                        type="email"
                        maxLength={254}
                        disabled={busy}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comm-domain">Domain (optional)</Label>
                      <Input
                        id="comm-domain"
                        maxLength={253}
                        disabled={busy}
                        value={domain}
                        onChange={(e) => setDomain(e.target.value.toLowerCase())}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comm-password">Temporary password</Label>
                    <Input
                      id="comm-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={12}
                      maxLength={128}
                      disabled={busy}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    {invalidPassword && (
                      <p className="text-sm text-destructive">Use 12–128 characters.</p>
                    )}
                  </div>
                  {(invalidEmail || invalidDomain) && (
                    <p role="alert" className="text-sm text-destructive">
                      Enter a valid company email address and domain.
                    </p>
                  )}
                  {!data.account?.mailAccountId && !password && (
                    <p className="text-sm text-muted-foreground">
                      Enter a temporary password to create the mailbox.
                    </p>
                  )}
                  {editingPlan && (
                    <p className="text-sm text-muted-foreground">
                      Save or close the channel plan editor before provisioning.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    A successful request can still leave failed or manual steps. Review the workflow
                    before continuing.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
          {step === 2 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Review and onboard</CardTitle>
                  <CardDescription>
                    Check the account and channels before creating anything in Zoho.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">Company email</dt>
                      <dd>
                        {data.account?.email ||
                          email.trim() ||
                          'Generate using ' + (domain.trim() || 'the configured company domain')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Profile</dt>
                      <dd>
                        {profiles.find((p) => p.id === data.plan?.profileId)?.name ||
                          'Custom channels'}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">Channels</dt>
                      <dd>
                        {channelIds(data.plan?.channelIds).map(nameFor).join(', ') ||
                          'No channels selected'}
                      </dd>
                    </div>
                  </dl>
                  <p className="text-sm text-muted-foreground">
                    Full onboarding creates Mail and Cliq accounts, applies the saved channels, and
                    sends a welcome email. Complete secure activation afterward.
                  </p>
                  <Button variant="outline" disabled={busy} onClick={() => setStep(1)}>
                    Edit email details
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ['onboard', 'Run full onboarding'],
                        ['provision-email', 'Provision Mail'],
                        ['provision-cliq', 'Provision Cliq'],
                        ['sync-channels', 'Sync employee channels'],
                      ] as const
                    ).map(([operation, label]) => (
                      <Button
                        key={operation}
                        variant={operation === 'onboard' ? 'default' : 'outline'}
                        disabled={
                          busy ||
                          invalidPassword ||
                          invalidEmail ||
                          invalidDomain ||
                          editingPlan ||
                          (operation === 'onboard' && !data.account?.mailAccountId && !password)
                        }
                        onClick={() => void provisionAccount(operation)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex-col">
                  <CardTitle>{employee.name}</CardTitle>
                  <CardDescription>
                    {employee.employeeCode} ·{' '}
                    {data.account?.email || 'No communication account yet'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm">Workflow</span>
                    <Status value={data.workflow?.status} />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || status.isFetching}
                      onClick={() => {
                        void status.refetch();
                        void logs.refetch();
                      }}
                    >
                      Refresh status
                    </Button>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-muted-foreground">Mail account</dt>
                      <dd className="break-all">
                        {data.account?.mailAccountId || 'Not provisioned'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Cliq user</dt>
                      <dd className="break-all">{data.account?.cliqUserId || 'Not provisioned'}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Activation</dt>
                      <dd>
                        <Status value={data.account?.activationStatus} />
                      </dd>
                    </div>
                  </dl>
                  {data.tasks.length === 0 && (
                    <p className="text-sm text-muted-foreground">Onboarding has not started.</p>
                  )}
                  {data.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {task.taskType === 'WELCOME' ? 'Welcome email' : task.taskType} ·{' '}
                          {task.attemptCount} attempts
                        </p>
                        <Status value={task.status} />
                        {task.lastError && (
                          <p className="break-all text-sm text-destructive">{task.lastError}</p>
                        )}
                      </div>
                      {task.status !== 'COMPLETED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy || invalidPassword}
                          onClick={() => void provisionAccount('retry', task.taskType)}
                        >
                          Retry step
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
          {step === 3 && (
            <>
              <Card>
                <CardHeader className="flex-col">
                  <CardTitle>Confirm employee activation</CardTitle>
                  <CardDescription>
                    Complete your organisation’s secure first-login or password-reset process in
                    Zoho Admin Console, then attest that activation is complete. Do not enter
                    passwords or tokens here.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Label htmlFor="comm-activation">Administrator confirmation</Label>
                  <Input
                    id="comm-activation"
                    minLength={10}
                    maxLength={500}
                    disabled={busy}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                  <Button
                    disabled={
                      busy ||
                      confirmation.trim().length < 10 ||
                      !data.account?.mailAccountId ||
                      data.account.activationStatus === 'COMPLETED'
                    }
                    onClick={async () => {
                      if (
                        await confirm({
                          title: 'Confirm activation is complete?',
                          description:
                            'This records your administrator attestation and marks the activation step complete.',
                          confirmLabel: 'Confirm activation',
                        })
                      )
                        void execute(async () => {
                          await activate({
                            employeeId: employee.id,
                            confirmation: confirmation.trim(),
                          }).unwrap();
                          setConfirmation('');
                          setNotice('Activation confirmed. Review the workflow status.');
                        });
                    }}
                  >
                    Confirm activation
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Communication activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ErrorNotice error={logs.error} />
            {logs.isLoading && <p role="status">Loading activity…</p>}
            {logs.data?.items.length === 0 && (
              <p className="text-sm text-muted-foreground">No communication activity yet.</p>
            )}
            {logs.data?.items.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap justify-between gap-2 border-b pb-3 text-sm"
              >
                <div>
                  <p className="font-medium">{log.operation.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">{log.createdAt}</p>
                  {log.errorCode && <p className="text-destructive">{log.errorCode}</p>}
                </div>
                <Status value={log.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {data && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => (step === 0 ? onBack() : setStep(step - 1))}
          >
            <ArrowLeft aria-hidden="true" />
            Back
          </Button>
          {step < 3 && (
            <Button
              disabled={
                busy ||
                (step === 0 && (editingPlan || !data.plan)) ||
                (step === 1 &&
                  (invalidPassword ||
                    invalidEmail ||
                    invalidDomain ||
                    (!data.account?.mailAccountId && !password)))
              }
              onClick={() => setStep(step + 1)}
            >
              {step === 1
                ? 'Review onboarding'
                : step === 2
                  ? 'Activation and activity'
                  : 'Continue'}
              <ArrowRight aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function EmployeeOnboarding({
  channels,
  profiles,
}: {
  channels: Channel[];
  profiles: Profile[];
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const employees = useGetEmployeesQuery({ search, page });
  const items = Array.isArray(employees.data) ? employees.data : employees.data?.items || [];
  const totalPages = Array.isArray(employees.data) ? 1 : employees.data?.totalPages || 1;
  const [selected, setSelected] = useState<Employee>();
  const [started, setStarted] = useState(false);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Employee onboarding</h2>
          <p className="text-sm text-muted-foreground">
            Provision Zoho Mail and Cliq for someone already in your team.
          </p>
        </div>
        <Link to="/communication/new-hire" className={buttonVariants({ variant: 'outline' })}>
          <UserPlus aria-hidden="true" />
          Add a new hire
        </Link>
      </div>
      {!started && (
        <>
          <StepProgress
            steps={[
              'Employee',
              'Channel plan',
              'Company email',
              'Review and onboard',
              'Activation and activity',
            ]}
            current={0}
          />
          <ErrorNotice error={employees.error} />
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <Label htmlFor="comm-search">Find an employee</Label>
            <Input
              id="comm-search"
              placeholder="Search by name or employee code…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <Label htmlFor="comm-employee">Employee</Label>
            <select
              id="comm-employee"
              className={selectClass}
              value={selected?.id || ''}
              disabled={employees.isFetching}
              onChange={(e) => setSelected(items.find((item) => item.id === e.target.value))}
            >
              <option value="">
                {employees.isFetching ? 'Loading employees…' : 'Select an employee'}
              </option>
              {selected && !items.some((e) => e.id === selected.id) && (
                <option value={selected.id}>
                  {selected.name} · {selected.employeeCode}
                </option>
              )}
              {items.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {e.employeeCode}
                </option>
              ))}
            </select>
            {!employees.isFetching && !employees.error && !items.length && (
              <p className="text-sm text-muted-foreground">No matching employees.</p>
            )}
            {totalPages > 1 && (
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || employees.isFetching}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages || employees.isFetching}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
          <div className="flex justify-end border-t pt-4">
            <Button
              disabled={!selected || selected.status !== 'ACTIVE'}
              onClick={() => setStarted(true)}
            >
              Continue
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
          {selected && selected.status !== 'ACTIVE' && (
            <p className="text-sm text-muted-foreground">Select an active employee to continue.</p>
          )}
        </>
      )}
      {started && selected ? (
        <EmployeeWorkspace
          key={selected.id}
          onBack={() => setStarted(false)}
          employee={selected}
          channels={channels}
          profiles={profiles}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Select an employee to manage communication accounts, channel plans and onboarding.
        </p>
      )}
    </div>
  );
}

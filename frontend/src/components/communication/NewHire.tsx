import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useCreateEmployeeMutation,
  useGetOrganisationsQuery,
  type Employee,
  type Organisation,
  type OrganisationsApiResponse,
} from '@/services/api/employees.api';
import type { Channel, Profile } from '@/services/api/communication.api';
import { EmployeeWorkspace } from './EmployeeOnboarding';
import { ErrorNotice, selectClass } from './shared';

type HireForm = {
  name: string;
  employeeCode: string;
  email: string;
  designation: string;
  organisationId: string;
};

const EMPTY: HireForm = {
  name: '',
  employeeCode: '',
  email: '',
  designation: '',
  organisationId: '',
};

function organisationsOf(data: OrganisationsApiResponse | undefined): Organisation[] {
  if (!data) return [];
  return Array.isArray(data) ? data : ((data as { items?: Organisation[] }).items ?? []);
}

/**
 * Creates the employee record, then hands the new employee straight to the
 * existing Zoho workflow (channel plan → company email → onboard → activation).
 * Nothing is sent to Zoho until the admin starts provisioning in that workspace.
 */
export function NewHire({ channels, profiles }: { channels: Channel[]; profiles: Profile[] }) {
  const [createEmployee, createState] = useCreateEmployeeMutation();
  const orgs = useGetOrganisationsQuery();
  const [form, setForm] = useState<HireForm>(EMPTY);
  const [created, setCreated] = useState<Employee>();
  const [error, setError] = useState<string>();

  const update = (key: keyof HireForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: e.target.value }));

  const emailInvalid = !!form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const canSubmit =
    !!form.name.trim() && !!form.employeeCode.trim() && !!form.email.trim() && !emailInvalid;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(undefined);
    try {
      const response = await createEmployee({
        name: form.name.trim(),
        employeeCode: form.employeeCode.trim(),
        email: form.email.trim(),
        status: 'ACTIVE',
        ...(form.designation.trim() ? { designation: form.designation.trim() } : {}),
        ...(form.organisationId ? { organisationId: form.organisationId } : {}),
      }).unwrap();
      if (!response.data) {
        setError(
          'The employee was created, but its details could not be loaded. Find them under Onboarding.',
        );
        return;
      }
      setCreated(response.data);
    } catch (err) {
      const message = (err as { data?: { message?: string | string[] } })?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(' ')
          : message || 'Could not create the employee. Check the details and try again.',
      );
    }
  };

  if (created) {
    return (
      <div className="space-y-5">
        <p
          role="status"
          className="rounded-2xl border border-success-border bg-success-muted p-4 text-sm text-success-strong"
        >
          {created.name} is added. Continue below to set their channel plan and start Zoho
          onboarding.
        </p>
        <EmployeeWorkspace
          key={created.id}
          employee={created}
          channels={channels}
          profiles={profiles}
          onBack={() => setCreated(undefined)}
        />
      </div>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex-col gap-1">
        <CardTitle>Add a new hire</CardTitle>
        <CardDescription>
          Creates the employee record. Their company mailbox and Cliq access are created in the next
          steps, only after you start provisioning.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={submit}
          noValidate
          className="grid gap-5 sm:grid-cols-2"
          aria-busy={createState.isLoading}
        >
          <div className="space-y-2">
            <Label htmlFor="hire-name">Full name</Label>
            <Input
              id="hire-name"
              autoComplete="off"
              value={form.name}
              onChange={update('name')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hire-code">Employee code</Label>
            <Input
              id="hire-code"
              autoComplete="off"
              value={form.employeeCode}
              onChange={update('employeeCode')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hire-email">Contact email</Label>
            <Input
              id="hire-email"
              type="email"
              autoComplete="off"
              value={form.email}
              onChange={update('email')}
              aria-invalid={emailInvalid || undefined}
              aria-describedby="hire-email-help"
              required
            />
            <p id="hire-email-help" className="text-xs text-muted-foreground">
              {emailInvalid
                ? 'Enter a valid email address.'
                : 'Personal or existing email. The company mailbox is created separately.'}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hire-designation">Designation</Label>
            <Input
              id="hire-designation"
              autoComplete="off"
              value={form.designation}
              onChange={update('designation')}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="hire-org">Organisation</Label>
            <select
              id="hire-org"
              className={selectClass}
              value={form.organisationId}
              onChange={update('organisationId')}
              disabled={orgs.isFetching}
            >
              <option value="">No organisation</option>
              {organisationsOf(orgs.data).map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 space-y-3">
            <ErrorNotice error={error} />
            <div className="flex justify-end border-t pt-4">
              <Button type="submit" disabled={!canSubmit || createState.isLoading}>
                {createState.isLoading ? 'Creating…' : 'Create employee'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

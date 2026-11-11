import { useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { useGetRoleAccessQuery } from '@/services/api/role.api';
import { useGetActivityLogsQuery, type ActivityFilters } from '@/services/api/activity.api';

const ENTITIES = ['Asset', 'AssetUnit', 'AssetAssignment', 'System', 'SystemSpecs', 'Software', 'AssetCategory', 'Employee', 'Organisation', 'User', 'Role', 'Credential', 'Account'];

function label(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export default function ActivityLogs() {
  const { data: access, isLoading: accessLoading, isError: accessError } = useGetRoleAccessQuery(undefined, { refetchOnMountOrArgChange: true });
  const allowed = access?.permissions.includes('users.manage') ?? false;
  const [draft, setDraft] = useState<ActivityFilters>({});
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [page, setPage] = useState(1);
  const { currentData: data, isFetching, isError, error, refetch } = useGetActivityLogsQuery({ ...filters, page }, {
    skip: !allowed,
    pollingInterval: 30000,
    refetchOnMountOrArgChange: true,
  });
  const validDates = !draft.from || !draft.to || draft.from <= draft.to;
  const applyFilters = (next: ActivityFilters) => {
    setFilters(Object.fromEntries(Object.entries(next).map(([key, value]) => [key, value?.trim()]).filter(([, value]) => value)));
    setPage(1);
  };
  // Search applies after typing pauses. Selects and date changes apply immediately.
  useEffect(() => {
    if (!validDates) return;
    const timer = window.setTimeout(() => applyFilters(draft), 300);
    return () => window.clearTimeout(timer);
  }, [draft, validDates]);
  const change = (key: keyof ActivityFilters, value: string) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    if (key !== 'search' && (!next.from || !next.to || next.from <= next.to)) applyFilters(next);
  };
  const errorMessage = (error as { data?: { message?: string | string[] } } | undefined)?.data?.message;
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / 50));

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Activity Logs" description="Review recorded business changes, account activity, and the users who performed them." />
      {accessLoading ? <p className="text-sm text-muted-foreground">Checking access…</p> : accessError ? (
        <p role="alert" className="text-sm text-destructive">Unable to verify access. Reload to try again.</p>
      ) : !allowed ? (
        <p role="alert" className="text-sm text-muted-foreground">User management permission is required to view activity logs.</p>
      ) : (
        <Card className="gap-4 p-5">
          <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
            event.preventDefault();
            if (validDates) applyFilters(draft);
          }}>
            <div className="min-w-48 flex-1 space-y-2">
              <Label htmlFor="activity-search">Search</Label>
              <Input id="activity-search" placeholder="User, action, entity or record ID" maxLength={200} value={draft.search || ''} onChange={e => change('search', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-entity">Entity</Label>
              <select id="activity-entity" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={draft.entity || ''} onChange={e => change('entity', e.target.value)}>
                <option value="">All entities</option>
                {ENTITIES.map(entity => <option key={entity} value={entity}>{label(entity)}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-from">From (UTC)</Label>
              <Input id="activity-from" type="date" max={draft.to || undefined} value={draft.from || ''} onChange={e => change('from', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="activity-to">To (UTC)</Label>
              <Input id="activity-to" type="date" min={draft.from || undefined} value={draft.to || ''} onChange={e => change('to', e.target.value)} />
            </div>
            <Button type="submit" disabled={!validDates}><Search className="h-4 w-4" />Apply</Button>
            <Button type="button" variant="outline" onClick={() => { setDraft({}); setFilters({}); setPage(1); }}>Reset</Button>
            <Button type="button" variant="outline" aria-label="Refresh activity logs" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></Button>
          </form>
          {!validDates && <p role="alert" className="text-sm text-destructive">Start date must precede end date.</p>}
          <p className="text-xs text-muted-foreground">Times use your local timezone. Date filters use UTC. Refreshes every 30 seconds.</p>
          {isError ? (
            <p role="alert" className="text-sm text-destructive">{Array.isArray(errorMessage) ? errorMessage.join(' ') : errorMessage || 'Unable to load activity logs. Use Refresh to try again.'}</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border" aria-busy={isFetching}>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Record ID</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {!data ? <TableRow><TableCell colSpan={5}>Loading activity logs…</TableCell></TableRow> : data.items.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No activity logs match these filters.</TableCell></TableRow>
                  ) : data.items.map(item => (
                    <TableRow key={item.id}>
                      <TableCell><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></TableCell>
                      <TableCell><p className="font-medium">{item.user?.name || 'System / deleted user'}</p><p className="text-xs text-muted-foreground">{item.user?.email}</p></TableCell>
                      <TableCell className="whitespace-normal"><span title={item.action}>{label(item.action)}</span></TableCell>
                      <TableCell>{label(item.entity)}</TableCell>
                      <TableCell className="font-mono text-xs">{item.entityId}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-muted-foreground">{data?.total ?? 0} records · Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page <= 1 || isFetching} onClick={() => setPage(previous => previous - 1)}>Previous</Button>
              <Button variant="outline" disabled={!data || page >= totalPages || isFetching} onClick={() => setPage(previous => previous + 1)}>Next</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

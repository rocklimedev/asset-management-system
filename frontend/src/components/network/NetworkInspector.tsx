import { useMemo, type ReactNode } from 'react';
import { Route, Trash2, X } from 'lucide-react';
import type { Connection, Device, NetworkDocument } from '../../types/network';
import type { Selection } from './NetworkCanvas';
import { deletionReason, portConnection, traceCore } from './topology';
import { KIND_OPTIONS, KindIcon, KIND_META, Field, Section, SelectField, deviceLabel, plural, shortEnd } from './network-ui';
import { useConfirm } from '../ui/confirm-dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { StatusPill, type PillTone } from '../list/StatusPill';
import { cn } from '@/lib/utils';

const MEDIUM_OPTIONS = [
  { value: 'copper', label: 'Copper' },
  { value: 'fiber', label: 'Fibre' },
  { value: 'wireless', label: 'Wireless' },
  { value: 'unknown', label: 'Unknown' },
];
const CONNECTION_KIND_OPTIONS = [
  { value: 'access', label: 'Access' },
  { value: 'uplink', label: 'Uplink' },
  { value: 'crosslink', label: 'Crosslink' },
];
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'planned', label: 'Planned' },
  { value: 'unknown', label: 'Unknown' },
];
const VERIFICATION_OPTIONS = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'unverified', label: 'Unverified' },
  { value: 'assumed', label: 'Assumed' },
];
const KIND_LABEL: Record<Connection['kind'], string> = { access: 'Access cable', uplink: 'Uplink', crosslink: 'Crosslink' };

type HealthCheck = {
  title: string;
  hint: string;
  tone: PillTone;
  count: number;
  items: { key: string; label: string; target: Selection }[];
};

/** Problems a network owner should review, computed from the documented topology. */
function healthChecks(d: NetworkDocument): HealthCheck[] {
  const cableItem = (c: Connection) => ({
    key: c.id,
    label: `${c.cableCode || 'Cable'} · ${deviceLabel(d, c.source.deviceId)} ↔ ${deviceLabel(d, c.target.deviceId)}`,
    target: { collection: 'connections' as const, id: c.id },
  });
  const deviceItem = (v: Device) => ({
    key: v.id,
    label: v.code || v.name,
    target: { collection: 'devices' as const, id: v.id },
  });

  const unresolved = d.connections.filter((c) => !c.source.portId || !c.target.portId);
  const unconfirmed = d.connections.filter((c) => c.verification !== 'confirmed');
  const planned = d.connections.filter((c) => c.status === 'planned');
  const isolated = d.devices.filter((v) => !d.connections.some((c) => c.source.deviceId === v.id || c.target.deviceId === v.id));
  const noRoute = d.devices.filter((v) => v.kind !== 'core' && traceCore(d, v.id) === null);
  const noRack = d.devices.filter((v) => !v.rackId);
  const noIp = d.devices.filter((v) => !v.ip);

  return [
    { title: 'Cables without assigned ports', hint: 'Record the physical port so the cable can be traced and checked.', tone: 'warn', count: unresolved.length, items: unresolved.map(cableItem) },
    { title: 'Devices with no cables', hint: 'Nothing connects these devices to the rest of the network.', tone: 'warn', count: isolated.length, items: isolated.map(deviceItem) },
    { title: 'No documented route to core', hint: 'Traces use documented, non-planned links only. This is not a live test.', tone: 'warn', count: noRoute.length, items: noRoute.map(deviceItem) },
    { title: 'Cables not yet confirmed', hint: 'Assumed or unverified links appear dashed on the map.', tone: 'info', count: unconfirmed.length, items: unconfirmed.map(cableItem) },
    { title: 'Planned cables', hint: 'Planned links are excluded from route tracing until they go live.', tone: 'info', count: planned.length, items: planned.map(cableItem) },
    { title: 'Devices outside a rack', hint: 'Wall-mounted or floor equipment is fine; record it if it should sit in a rack.', tone: 'neutral', count: noRack.length, items: noRack.map(deviceItem) },
    { title: 'Devices without an IP address', hint: 'Add addresses for equipment you manage remotely.', tone: 'neutral', count: noIp.length, items: noIp.map(deviceItem) },
  ];
}

export function NetworkInspector({
  document: d,
  selection,
  onChange,
  onDelete,
  select,
  onTrace,
  onAddPort,
}: {
  document: NetworkDocument;
  selection: Selection;
  onChange: (d: NetworkDocument) => void;
  onDelete: () => void;
  select: (s: Selection) => void;
  onTrace: (id: string) => void;
  onAddPort: (id: string) => void;
}) {
  const checks = useMemo(() => healthChecks(d), [d]);
  if (!selection) return <Overview document={d} checks={checks} onChange={onChange} onSelect={select} />;

  const sel = selection;
  const item = (d[sel.collection] as Array<{ id: string }>).find((v) => v.id === sel.id);
  if (!item) return <Overview document={d} checks={checks} onChange={onChange} onSelect={select} />;
  const record = item as unknown as Record<string, unknown>;

  const patch = (changes: Record<string, unknown>) => {
    const next = structuredClone(d);
    const list = next[sel.collection] as Array<{ id: string }>;
    Object.assign(list.find((v) => v.id === sel.id)!, changes);
    onChange(next);
  };

  const textField = (key: string, label: string, options: { mono?: boolean } = {}) => {
    const id = `net-${sel.collection}-${key}`;
    return (
      <Field label={label} htmlFor={id}>
        <Input
          id={id}
          className={cn(options.mono && 'font-mono')}
          value={String(record[key] ?? '')}
          maxLength={255}
          onChange={(e) => patch({ [key]: e.target.value })}
        />
      </Field>
    );
  };

  const notesField = (
    <Field label="Notes" htmlFor={`net-${sel.collection}-notes`}>
      <Textarea
        id={`net-${sel.collection}-notes`}
        value={String(record.notes ?? '')}
        maxLength={2000}
        onChange={(e) => patch({ notes: e.target.value })}
        rows={3}
      />
    </Field>
  );

  const deleteLabel = sel.collection === 'connections' ? 'Disconnect cable' : `Delete ${sel.collection.slice(0, -1)}`;
  const reason = deletionReason(d, sel.collection, sel.id);

  let title = '';
  let eyebrow = '';
  let headerIcon: ReactNode = null;
  let body: ReactNode;

  if (sel.collection === 'areas') {
    const a = d.areas.find((x) => x.id === sel.id)!;
    eyebrow = 'Area';
    title = a.name;
    const descendants = new Set([a.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const candidate of d.areas)
        if (candidate.parentId && descendants.has(candidate.parentId) && !descendants.has(candidate.id)) {
          descendants.add(candidate.id);
          changed = true;
        }
    }
    const devices = d.devices.filter((v) => v.areaId === a.id);
    body = (
      <>
        <Section title="Identity">
          {textField('name', 'Area name')}
          <SelectField
            label="Parent area"
            value={a.parentId || ''}
            options={d.areas.filter((v) => !descendants.has(v.id)).map((v) => ({ value: v.id, label: v.name }))}
            emptyLabel="Top level area"
            onChange={(id) => patch({ parentId: id || null })}
          />
        </Section>
        <Section title={`Inside this area (${devices.length} devices)`}>
          <p className="text-sm text-muted-foreground">{plural(d.racks.filter((r) => r.areaId === a.id).length, 'rack')} hold equipment here.</p>
          <DeviceLinks devices={devices} onSelect={(id) => select({ collection: 'devices', id })} />
        </Section>
      </>
    );
  } else if (sel.collection === 'racks') {
    const r = d.racks.find((x) => x.id === sel.id)!;
    eyebrow = 'Rack';
    title = r.name;
    const equipment = d.devices.filter((v) => v.rackId === r.id);
    body = (
      <>
        <Section title="Identity">
          {textField('name', 'Rack name')}
          <SelectField
            label="Physical area"
            value={r.areaId}
            options={d.areas.map((a) => ({ value: a.id, label: a.name }))}
            onChange={(areaId) => {
              const next = structuredClone(d);
              next.racks.find((v) => v.id === r.id)!.areaId = areaId;
              next.devices.filter((v) => v.rackId === r.id).forEach((v) => (v.areaId = areaId));
              onChange(next);
            }}
          />
        </Section>
        <Section title={`Equipment (${equipment.length})`}>
          <DeviceLinks devices={equipment} onSelect={(id) => select({ collection: 'devices', id })} empty="Empty rack. Move a device here from its details." />
        </Section>
      </>
    );
  } else if (sel.collection === 'devices') {
    const v = d.devices.find((x) => x.id === sel.id)!;
    const ports = d.ports.filter((p) => p.deviceId === v.id);
    const connections = d.connections.filter((c) => c.source.deviceId === v.id || c.target.deviceId === v.id);
    const path = traceCore(d, v.id);
    const racks = d.racks.filter((r) => r.areaId === v.areaId);
    eyebrow = KIND_META[v.kind].label;
    title = v.name;
    headerIcon = <KindIcon kind={v.kind} className="h-5 w-5" />;
    body = (
      <>
        <Section title="Identity">
          <div className="grid gap-3 sm:grid-cols-2">
            {textField('name', 'Device name')}
            {textField('code', 'Code or asset tag', { mono: true })}
          </div>
          <SelectField label="Device type" value={v.kind} options={KIND_OPTIONS} onChange={(kind) => patch({ kind })} />
        </Section>

        <Section title="Location">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Physical area"
              value={v.areaId}
              options={d.areas.map((a) => ({ value: a.id, label: a.name }))}
              onChange={(areaId) => patch({ areaId, rackId: null })}
            />
            <SelectField label="Rack" value={v.rackId || ''} options={racks.map((r) => ({ value: r.id, label: r.name }))} emptyLabel="Outside a rack" onChange={(id) => patch({ rackId: id || null })} />
          </div>
        </Section>

        <Section title="Addressing">
          <div className="grid gap-3 sm:grid-cols-2">
            {textField('model', 'Model')}
            {textField('ip', 'IP address', { mono: true })}
          </div>
          {textField('mac', 'MAC address', { mono: true })}
        </Section>

        <Section
          title={`Ports (${ports.length})`}
          action={
            <Button size="xs" variant="outline" onClick={() => onAddPort(v.id)}>
              Add port
            </Button>
          }
        >
          {ports.length ? (
            <>
              <div className="grid grid-cols-6 gap-1.5">
                {ports.map((p) => {
                  const used = !!portConnection(d, p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      title={`Port ${p.label} · ${used ? 'Connected' : 'Available'}`}
                      onClick={() => select({ collection: 'ports', id: p.id })}
                      className={cn(
                        'h-8 rounded-md border font-mono text-xs font-medium tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                        used ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15' : 'border-border bg-muted text-muted-foreground hover:bg-accent',
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Blue ports are cabled. Grey ports are free.</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No ports yet. Add a port to start recording cables.</p>
          )}
        </Section>

        <Section title={`Cables (${connections.length})`}>
          {connections.length ? (
            <div className="space-y-1.5">
              {connections.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => select({ collection: 'connections', id: c.id })}
                  className="block w-full rounded-lg border border-border p-2.5 text-left transition-colors hover:bg-muted"
                >
                  <p className="text-sm font-medium">{c.cableCode || KIND_LABEL[c.kind]}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {shortEnd(d, c.source)} ↔ {shortEnd(d, c.target)}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Not connected to anything yet.</p>
          )}
        </Section>

        <Section title="Route to core">
          <Button size="sm" variant="outline" onClick={() => onTrace(v.id)}>
            <Route />
            Trace to core
          </Button>
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            {path === null
              ? 'No documented route to a core switch.'
              : path.length === 0
                ? 'This is a core switch.'
                : `${plural(path.length, 'connection')} to core. Includes assumed or unverified links when present. This is documented topology, not a live connectivity test.`}
          </div>
        </Section>
      </>
    );
  } else if (sel.collection === 'ports') {
    const p = d.ports.find((x) => x.id === sel.id)!;
    const c = portConnection(d, p.id);
    const owner = d.devices.find((v) => v.id === p.deviceId);
    eyebrow = 'Port';
    title = `Port ${p.label}`;
    body = (
      <>
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <span className="text-muted-foreground">On device </span>
          <span className="font-medium">{owner?.name ?? 'Unknown device'}</span>
        </div>
        <Section title="Port">
          <div className="grid gap-3 sm:grid-cols-2">
            {textField('label', 'Port number or label', { mono: true })}
            <SelectField label="Medium" value={p.medium} options={MEDIUM_OPTIONS} onChange={(medium) => patch({ medium })} />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={p.poe} onCheckedChange={(checked) => patch({ poe: checked === true })} />
            PoE capable
          </label>
        </Section>
        <Section title="Cable">
          {c ? (
            <button type="button" onClick={() => select({ collection: 'connections', id: c.id })} className="block w-full rounded-lg border border-border p-3 text-left hover:bg-muted">
              <p className="text-sm font-medium">{c.cableCode || KIND_LABEL[c.kind]}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {shortEnd(d, c.source)} ↔ {shortEnd(d, c.target)}
              </p>
            </button>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">Free. No cable is recorded on this port.</div>
          )}
        </Section>
      </>
    );
  } else {
    const c = d.connections.find((x) => x.id === sel.id)!;
    eyebrow = 'Cable';
    title = c.cableCode || KIND_LABEL[c.kind];
    const endpoint = (key: 'source' | 'target') => {
      const end = c[key];
      const other = c[key === 'source' ? 'target' : 'source'];
      const available = d.ports.filter((p) => p.deviceId === end.deviceId && !portConnection(d, p.id, c.id));
      return (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{key === 'source' ? 'From' : 'To'}</p>
          <SelectField
            label="Device"
            value={end.deviceId}
            options={d.devices
              .filter((v) => v.id !== other.deviceId)
              .map((v) => ({ value: v.id, label: `${v.code || v.name} · ${d.areas.find((a) => a.id === v.areaId)?.name ?? 'No area'}` }))}
            onChange={(id) => patch({ [key]: { deviceId: id, portId: null } })}
          />
          <SelectField
            label="Physical port"
            value={end.portId || ''}
            options={available.map((p) => ({ value: p.id, label: `Port ${p.label}${p.poe ? ' · PoE' : ''} · ${p.medium}` }))}
            emptyLabel="Unassigned, not yet recorded"
            onChange={(id) => patch({ [key]: { ...end, portId: id || null } })}
          />
          <p className="text-xs text-muted-foreground">{shortEnd(d, end)}</p>
        </div>
      );
    };
    body = (
      <>
        <Section title="Cable">{textField('cableCode', 'Cable or wire code', { mono: true })}</Section>
        <div className="grid gap-3">
          {endpoint('source')}
          {endpoint('target')}
        </div>
        <Section title="Classification">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField label="Connection type" value={c.kind} options={CONNECTION_KIND_OPTIONS} onChange={(kind) => patch({ kind })} />
            <SelectField label="Cable medium" value={c.medium} options={MEDIUM_OPTIONS} onChange={(medium) => patch({ medium })} />
            <SelectField label="Operational status" value={c.status} options={STATUS_OPTIONS} onChange={(status) => patch({ status })} />
            <SelectField label="Documentation" value={c.verification} options={VERIFICATION_OPTIONS} onChange={(verification) => patch({ verification })} />
          </div>
        </Section>
        {(!c.source.portId || !c.target.portId) && (
          <Alert variant="info">
            <AlertDescription>One end has no port yet. The cable is kept; select the actual port when you know it.</AlertDescription>
          </Alert>
        )}
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {headerIcon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">{headerIcon}</span>}
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{eyebrow}</p>
            <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close inspector" onClick={() => select(null)}>
          <X />
        </Button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {body}
        <Separator />
        {notesField}
      </div>

      <div className="border-t border-border bg-muted/40 p-3">
        {reason && <p className="mb-2 text-xs text-muted-foreground">{reason}</p>}
        <Button variant="destructive" size="sm" className="w-full" disabled={!!reason} onClick={onDelete}>
          <Trash2 />
          {deleteLabel}
        </Button>
      </div>
    </div>
  );
}

function DeviceLinks({ devices, onSelect, empty = 'Nothing here yet.' }: { devices: Device[]; onSelect: (id: string) => void; empty?: string }) {
  if (!devices.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {devices.map((v) => (
        <Button key={v.id} size="xs" variant="outline" onClick={() => onSelect(v.id)}>
          <KindIcon kind={v.kind} />
          {v.code || v.name}
        </Button>
      ))}
    </div>
  );
}

/** Idle state: what needs attention, plus map-level settings. */
function Overview({
  document: d,
  checks,
  onChange,
  onSelect,
}: {
  document: NetworkDocument;
  checks: HealthCheck[];
  onChange: (d: NetworkDocument) => void;
  onSelect: (s: Selection) => void;
}) {
  const confirm = useConfirm();
  const issues = checks.reduce((sum, check) => sum + check.count, 0);

  async function clearMeasurements() {
    const ok = await confirm({
      title: 'Clear all measurements?',
      description: `${plural(d.dims.length, 'measurement')} will be removed from the map.`,
      confirmLabel: 'Clear measurements',
      tone: 'danger',
    });
    if (ok) onChange({ ...d, dims: [] });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overview</p>
        <h2 className="text-base font-semibold text-foreground">Network health</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {issues ? `${plural(issues, 'item')} to review. Select one to open it.` : 'Everything documented is in order.'}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-2.5">
          {checks.map((check) => (
            <div key={check.title} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{check.title}</p>
                {check.count ? <StatusPill tone={check.tone}>{check.count}</StatusPill> : <StatusPill tone="ok">Clear</StatusPill>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{check.hint}</p>
              {check.items.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {check.items.slice(0, 4).map((item) => (
                    <Button key={item.key} size="xs" variant="outline" onClick={() => onSelect(item.target)}>
                      {item.label}
                    </Button>
                  ))}
                  {check.items.length > 4 && <span className="text-xs text-muted-foreground">+{check.items.length - 4} more</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        <Separator />

        <Section title="Map scale">
          <Field label="Map units per metre" htmlFor="net-units-per-metre">
            <div className="flex items-center gap-2">
              <Input
                id="net-units-per-metre"
                type="number"
                min={1}
                max={1000000}
                className="w-28 font-mono"
                value={d.settings.unitsPerMeter}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value > 0 && Number.isFinite(value)) onChange({ ...d, settings: { ...d.settings, unitsPerMeter: value } });
                }}
              />
              <span className="text-sm text-muted-foreground">units = 1 m</span>
            </div>
          </Field>
          {d.dims.length > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
              <span className="text-sm text-muted-foreground">{plural(d.dims.length, 'measurement')} on the map</span>
              <Button size="xs" variant="outline" onClick={() => void clearMeasurements()}>
                Clear
              </Button>
            </div>
          )}
        </Section>

        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
          Select anything on the map or in the explorer to edit it. Press Esc to clear the selection.
        </p>
      </div>
    </div>
  );
}

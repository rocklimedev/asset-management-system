import { Plus } from 'lucide-react';
import type { Connection, Device, NetworkDocument, Port, Rack, Area } from '../../types/network';
import type { Selection } from './NetworkCanvas';
import { portConnection } from './topology';
import { KindIcon, KIND_META, plural, shortEnd } from './network-ui';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { StatusPill, type PillTone } from '../list/StatusPill';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '@/lib/utils';

export type Collection = 'areas' | 'racks' | 'devices' | 'ports' | 'connections';
export type NetworkItem = Area | Rack | Device | Port | Connection;

const TITLES: Record<Collection, { singular: string; plural: string; addLabel: string }> = {
  areas: { singular: 'area', plural: 'Areas', addLabel: 'New area' },
  racks: { singular: 'rack', plural: 'Racks', addLabel: 'New rack' },
  devices: { singular: 'device', plural: 'Devices', addLabel: 'New device' },
  ports: { singular: 'port', plural: 'Ports', addLabel: 'New port' },
  connections: { singular: 'cable', plural: 'Cables', addLabel: 'Connect devices' },
};

const VERIFICATION_TONE: Record<Connection['verification'], PillTone> = {
  confirmed: 'ok',
  unverified: 'warn',
  assumed: 'info',
};

export function NetworkExplorer({
  document: d,
  tab,
  items,
  selection,
  onSelect,
  onAdd,
  hasFilters,
}: {
  document: NetworkDocument;
  tab: Collection;
  items: NetworkItem[];
  selection: Selection;
  onSelect: (s: Selection) => void;
  onAdd: () => void;
  hasFilters: boolean;
}) {
  const meta = TITLES[tab];
  const rowClass = (active: boolean) =>
    cn(
      'block w-full rounded-lg border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
      active ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted',
    );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-sm font-semibold text-foreground">{meta.plural}</h2>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {items.length}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus />
          {meta.addLabel}
        </Button>
      </div>

      <div
        className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2"
        role="list"
        aria-label={meta.plural}
      >
        {!items.length && (
          <div className="p-2">
            <EmptyState
              title={
                hasFilters
                  ? `No matching ${meta.plural.toLowerCase()}`
                  : `No ${meta.plural.toLowerCase()} yet`
              }
              description={
                hasFilters
                  ? 'Clear the search or area filter to see everything.'
                  : `Add a ${meta.singular} to start mapping.`
              }
            />
          </div>
        )}

        {tab === 'areas' &&
          (items as Area[]).map((a) => {
            const racks = d.racks.filter((r) => r.areaId === a.id).length;
            const devices = d.devices.filter((v) => v.areaId === a.id).length;
            const parent = d.areas.find((p) => p.id === a.parentId)?.name;
            return (
              <button
                key={a.id}
                role="listitem"
                className={rowClass(selection?.id === a.id)}
                onClick={() => onSelect({ collection: 'areas', id: a.id })}
              >
                <p className="truncate text-sm font-medium">{a.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {parent ? `Inside ${parent} · ` : 'Top level · '}
                  {plural(racks, 'rack')} · {plural(devices, 'device')}
                </p>
              </button>
            );
          })}

        {tab === 'racks' &&
          (items as Rack[]).map((r) => {
            const devices = d.devices.filter((v) => v.rackId === r.id).length;
            const area = d.areas.find((a) => a.id === r.areaId)?.name ?? 'No area';
            return (
              <button
                key={r.id}
                role="listitem"
                className={rowClass(selection?.id === r.id)}
                onClick={() => onSelect({ collection: 'racks', id: r.id })}
              >
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {area} · {plural(devices, 'device')}
                </p>
              </button>
            );
          })}

        {tab === 'devices' &&
          groupBy(
            items as Device[],
            (v) => d.areas.find((a) => a.id === v.areaId)?.name ?? 'No area',
          ).map(([group, devices]) => (
            <div key={group} className="space-y-1">
              <p className="px-2 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group}
              </p>
              {devices.map((v) => {
                const ports = d.ports.filter((p) => p.deviceId === v.id);
                const used = ports.filter((p) => portConnection(d, p.id)).length;
                return (
                  <button
                    key={v.id}
                    role="listitem"
                    className={rowClass(selection?.id === v.id)}
                    onClick={() => onSelect({ collection: 'devices', id: v.id })}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                        <KindIcon kind={v.kind} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{v.name}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {v.code || 'No code'}
                          {v.ip ? ` · ${v.ip}` : ''}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[11px]">
                        {used}/{ports.length} ports
                      </Badge>
                    </div>
                    <p className="mt-1 pl-9 text-[11px] text-muted-foreground">
                      {KIND_META[v.kind].label}
                      {v.rackId ? ' · in rack' : ' · not in a rack'}
                    </p>
                  </button>
                );
              })}
            </div>
          ))}

        {tab === 'ports' &&
          groupBy(
            items as Port[],
            (p) => d.devices.find((v) => v.id === p.deviceId)?.name ?? 'Unknown device',
          ).map(([group, ports]) => (
            <div key={group} className="space-y-1">
              <p className="px-2 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group}
              </p>
              {ports.map((p) => {
                const connected = !!portConnection(d, p.id);
                return (
                  <button
                    key={p.id}
                    role="listitem"
                    className={rowClass(selection?.id === p.id)}
                    onClick={() => onSelect({ collection: 'ports', id: p.id })}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="font-mono text-sm font-medium">Port {p.label}</span>
                        <Badge variant="outline" className="text-[11px] capitalize">
                          {p.medium}
                        </Badge>
                        {p.poe && (
                          <Badge variant="outline" className="text-[11px]">
                            PoE
                          </Badge>
                        )}
                      </div>
                      <StatusPill tone={connected ? 'ok' : 'neutral'}>
                        {connected ? 'Connected' : 'Free'}
                      </StatusPill>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

        {tab === 'connections' &&
          (items as Connection[]).map((c) => (
            <button
              key={c.id}
              role="listitem"
              className={rowClass(selection?.id === c.id)}
              onClick={() => onSelect({ collection: 'connections', id: c.id })}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">
                  {c.cableCode || (
                    <span className="italic text-muted-foreground">Unlabelled cable</span>
                  )}
                </p>
                <StatusPill tone={VERIFICATION_TONE[c.verification]}>{c.verification}</StatusPill>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {shortEnd(d, c.source)} <span aria-hidden="true">↔</span> {shortEnd(d, c.target)}
              </p>
              {(!c.source.portId || !c.target.portId) && (
                <p className="mt-1 text-[11px] font-medium text-warning-strong">
                  Port not yet assigned
                </p>
              )}
            </button>
          ))}
      </div>
    </div>
  );
}

/** Groups in first-seen order, so the explorer keeps the same sequence as the data. */
function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const name = key(item);
    groups.set(name, [...(groups.get(name) ?? []), item]);
  }
  return [...groups.entries()];
}

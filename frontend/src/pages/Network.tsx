import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  Building2,
  Cable,
  Download,
  Eye,
  LayoutGrid,
  MousePointer2,
  MoreHorizontal,
  Plug,
  PanelLeft,
  PanelRight,
  Redo2,
  RefreshCw,
  Route,
  Ruler,
  Save,
  Search,
  TriangleAlert,
  Undo2,
  Upload,
  Maximize2,
  type LucideIcon,
} from 'lucide-react';
import { BACKEND } from '../lib/api';
import { useAuth } from '../services/context/AuthContext';
import type { Connection, ConnectionEnd, Device, NetworkDocument, Port } from '../types/network';
import { NetworkCanvas, type Selection } from '../components/network/NetworkCanvas';
import { NetworkInspector } from '../components/network/NetworkInspector';
import {
  NetworkExplorer,
  type Collection,
  type NetworkItem,
} from '../components/network/NetworkExplorer';
import { ToolbarSelect } from '../components/network/network-ui';
import {
  deletionReason,
  endLabel,
  portConnection,
  traceCore,
  uid,
  withinArea,
} from '../components/network/topology';
import { Button, buttonVariants } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import { EmptyState } from '../components/ui/EmptyState';
import { toast } from '../components/ui/toast';
import { useConfirm } from '../components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { PageHeader } from '@/components/layout/PageHeader';
import { SegmentedControl } from '@/components/list/SegmentedControl';
import { StatusPill } from '@/components/list/StatusPill';
import { cn } from '@/lib/utils';

type Mode = 'select' | 'connect' | 'measure';

const MODE_OPTIONS: { value: Mode; label: string; icon: LucideIcon }[] = [
  { value: 'select', label: 'Select', icon: MousePointer2 },
  { value: 'connect', label: 'Connect', icon: Cable },
  { value: 'measure', label: 'Measure', icon: Ruler },
];

export default function Network() {
  const { accessToken } = useAuth();
  const confirm = useConfirm();

  const [document, setDocument] = useState<NetworkDocument | null>(null);
  const [revision, setRevision] = useState(0);
  const [baseline, setBaseline] = useState('');
  const [selection, setSelection] = useState<Selection>(null);
  const [tab, setTab] = useState<Collection>('racks');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [areaId, setAreaId] = useState('');
  const [fitKey, setFitKey] = useState(0);
  const [mode, setMode] = useState<Mode>('select');
  const [pending, setPending] = useState<ConnectionEnd | null>(null);
  const [showAreas, setShowAreas] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [grid, setGrid] = useState(true);
  const [snap, setSnap] = useState(false);
  const [compactRackConnections, setCompactRackConnections] = useState(true);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [traceId, setTraceId] = useState('');
  const history = useRef<NetworkDocument[]>([]),
    redo = useRef<NetworkDocument[]>([]),
    lastHistory = useRef(0);
  const file = useRef<HTMLInputElement>(null);

  const serialized = useMemo(() => (document ? JSON.stringify(document) : ''), [document]);
  const dirty = serialized !== baseline;
  const linking = mode === 'connect';
  const dimensionMode = mode === 'measure';

  async function api(path = '', method = 'GET', body?: unknown) {
    const response = await fetch(BACKEND + '/network' + path, {
      method,
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message || 'Network request failed.',
      );
    return data;
  }

  function enterMode(next: Mode) {
    setMode(next);
    setPending(null);
    setError('');
  }

  async function load() {
    if (
      dirty &&
      !(await confirm({
        title: 'Discard unsaved edits?',
        description: 'Reloading replaces your draft with the last saved network.',
        confirmLabel: 'Discard and reload',
        tone: 'danger',
      }))
    )
      return;
    setBusy(true);
    setError('');
    try {
      const data = await api();
      setDocument(data.document);
      setRevision(data.revision);
      setBaseline(JSON.stringify(data.document));
      setSelection(null);
      setPending(null);
      setMode('select');
      setTraceId('');
      setAreaId('');
      history.current = [];
      redo.current = [];
      setFitKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load topology.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, [accessToken]);

  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    // Navigation guard stays synchronous: a link click must be cancelled before the router reads it.
    const navigate = (e: MouseEvent) => {
      const link = (e.target as Element).closest('a');
      if (dirty && link && !window.confirm('Leave with unsaved network edits?')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', before);
    window.document.addEventListener('click', navigate, true);
    return () => {
      window.removeEventListener('beforeunload', before);
      window.document.removeEventListener('click', navigate, true);
    };
  }, [dirty]);

  function change(next: NetworkDocument) {
    if (document && Date.now() - lastHistory.current > 600) {
      history.current.push(document);
      if (history.current.length > 100) history.current.shift();
      lastHistory.current = Date.now();
    }
    redo.current = [];
    setDocument(next);
  }

  function undo() {
    if (document && history.current.length) {
      redo.current.push(document);
      setDocument(history.current.pop()!);
      lastHistory.current = 0;
    }
  }

  function redoEdit() {
    if (document && redo.current.length) {
      history.current.push(document);
      setDocument(redo.current.pop()!);
      lastHistory.current = 0;
    }
  }

  async function save() {
    if (!document) return;
    setBusy(true);
    setError('');
    const snapshot = serialized;
    try {
      const data = await api('', 'PUT', { document, revision });
      setRevision(data.revision);
      setBaseline(snapshot);
      toast.add({
        title: 'Network saved',
        description: `Revision ${data.revision} is now the live version.`,
        type: 'success',
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Save failed. Your edits remain available to export.',
      );
    } finally {
      setBusy(false);
    }
  }

  function exportJSON() {
    if (!document) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }),
    );
    const a = window.document.createElement('a');
    a.href = url;
    a.download = 'office-network.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJSON(imported: File) {
    if (
      dirty &&
      !(await confirm({
        title: 'Replace the network with this file?',
        description: 'Your unsaved edits will be replaced. Nothing is saved until you press Save.',
        confirmLabel: 'Import file',
        tone: 'danger',
      }))
    )
      return;
    setBusy(true);
    setError('');
    try {
      const data = await api('/validate', 'POST', { document: JSON.parse(await imported.text()) });
      change(data.document);
      setSelection(null);
      setAreaId('');
      setTraceId('');
      setFitKey((k) => k + 1);
      toast.add({
        title: 'File imported',
        description: 'Review the map, then save to publish it.',
        type: 'info',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import JSON.');
    } finally {
      setBusy(false);
    }
  }

  function select(next: Selection) {
    setSelection(next);
    if (next) setTab(next.collection);
  }

  function connect(source: ConnectionEnd, target: ConnectionEnd) {
    if (!document) return;
    if (source.deviceId === target.deviceId) {
      setError('Choose two different devices.');
      return;
    }
    if ([source, target].some((end) => end.portId && portConnection(document, end.portId))) {
      setError(
        'A selected port already has a cable. Disconnect that cable or choose another port.',
      );
      return;
    }
    const sourcePort = document.ports.find((p) => p.id === source.portId),
      targetPort = document.ports.find((p) => p.id === target.portId);
    if (
      sourcePort &&
      targetPort &&
      sourcePort.medium !== 'unknown' &&
      targetPort.medium !== 'unknown' &&
      sourcePort.medium !== targetPort.medium
    ) {
      setError('Choose ports with matching media.');
      return;
    }
    const next = structuredClone(document),
      id = uid();
    const backbone = [source, target].every((end) =>
      ['core', 'switch', 'router'].includes(
        document.devices.find((v) => v.id === end.deviceId)!.kind,
      ),
    );
    next.connections.push({
      id,
      source,
      target,
      kind: backbone ? 'uplink' : 'access',
      cableCode: '',
      medium: sourcePort?.medium || targetPort?.medium || 'unknown',
      status: 'unknown',
      verification: 'unverified',
      notes: '',
    });
    change(next);
    select({ collection: 'connections', id });
    enterMode('select');
  }

  function clickPort(end: ConnectionEnd) {
    if (!document) return;
    if (end.portId && portConnection(document, end.portId)) {
      setError('This port is occupied. Disconnect its cable before reusing it.');
      return;
    }
    if (!pending) {
      setPending(end);
      setError('');
    } else connect(pending, end);
  }

  function addPort(deviceId: string) {
    if (!document) return;
    const next = structuredClone(document),
      id = uid();
    const labels = new Set(next.ports.filter((p) => p.deviceId === deviceId).map((p) => p.label));
    let number = 1;
    while (labels.has(String(number))) number++;
    next.ports.push({
      id,
      deviceId,
      label: String(number),
      medium: 'copper',
      poe: false,
      notes: '',
    });
    change(next);
    select({ collection: 'ports', id });
  }

  function add() {
    if (!document) return;
    const next = structuredClone(document),
      id = uid(),
      area = areaId || document.areas[0]?.id;
    if (tab === 'areas')
      next.areas.push({ id, name: 'New area', parentId: areaId || null, notes: '', x: 0, y: 0 });
    if (tab === 'racks') {
      if (!area) return setError('Create an area first.');
      next.racks.push({ id, name: 'New rack', areaId: area, notes: '', x: 0, y: 0 });
    }
    if (tab === 'devices') {
      if (!area) return setError('Create an area first.');
      next.devices.push({
        id,
        name: 'New device',
        code: '',
        kind: 'switch',
        areaId: area,
        rackId: null,
        model: '',
        ip: '',
        mac: '',
        notes: '',
        x: 0,
        y: 0,
      });
    }
    if (tab === 'ports') {
      const device = selection?.collection === 'devices' ? selection.id : document.devices[0]?.id;
      if (!device) return setError('Create a device first.');
      addPort(device);
      return;
    }
    if (tab === 'connections') {
      if (document.devices.length < 2) return setError('Create two devices first.');
      enterMode('connect');
      return;
    }
    change(next);
    select({ collection: tab, id });
  }

  async function remove() {
    if (!document || !selection) return;
    const reason = deletionReason(document, selection.collection, selection.id);
    if (reason) {
      setError(reason);
      return;
    }
    const isCable = selection.collection === 'connections';
    const ok = await confirm({
      title: isCable
        ? 'Disconnect this cable?'
        : `Delete this ${selection.collection.slice(0, -1)}?`,
      description: isCable
        ? 'The cable record is removed. Its ports become available again.'
        : 'It is removed from the draft. Save the network to keep the change.',
      confirmLabel: isCable ? 'Disconnect cable' : 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    const next = structuredClone(document);
    const lists = next as unknown as Record<string, Array<{ id: string }>>;
    lists[selection.collection] = lists[selection.collection].filter((v) => v.id !== selection.id);
    if (selection.collection === 'devices')
      next.ports = next.ports.filter((p) => p.deviceId !== selection.id);
    change(next);
    setSelection(null);
    setError('');
  }

  // Keyboard: Ctrl/Cmd+Z undo, Shift for redo, Ctrl/Cmd+S save, Delete removes, Esc backs out,
  // and V / C / M switch modes. Shortcuts are ignored while typing in a field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = !!target?.closest(
        'input,textarea,select,[contenteditable="true"],[role="listbox"]',
      );
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty && !busy) void save();
        return;
      }
      if (typing) return;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redoEdit();
        else undo();
        return;
      }
      if (mod) return;
      if (e.key === 'Escape') {
        if (mode !== 'select') enterMode('select');
        else if (selection) select(null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection) {
        e.preventDefault();
        void remove();
        return;
      }
      if (e.key === 'v') enterMode('select');
      if (e.key === 'c') enterMode('connect');
      if (e.key === 'm') enterMode('measure');
      if (e.key === 'f') setFitKey((k) => k + 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const trace = useMemo(
    () => (document && traceId ? traceCore(document, traceId) : null),
    [document, traceId],
  );
  const unresolved =
    document?.connections.filter((c) => !c.source.portId || !c.target.portId).length ?? 0;
  const selectedDevice = selection?.collection === 'devices' ? selection.id : null;
  const hasFilters = !!(query.trim() || areaId);

  function visibleFor(d: NetworkDocument): NetworkItem[] {
    const q = query.trim().toLowerCase();
    return (d[tab] as NetworkItem[]).filter((item) => {
      if (q && !JSON.stringify(item).toLowerCase().includes(q)) {
        if (tab === 'ports') {
          if (
            !d.devices
              .find((v) => v.id === (item as Port).deviceId)
              ?.name.toLowerCase()
              .includes(q)
          )
            return false;
        } else if (tab === 'connections') {
          const cable = item as Connection;
          if (
            ![endLabel(d, cable.source), endLabel(d, cable.target)]
              .join(' ')
              .toLowerCase()
              .includes(q)
          )
            return false;
        } else return false;
      }
      if (!areaId) return true;
      if (tab === 'areas') return withinArea(d, item.id, areaId);
      if (tab === 'ports')
        return withinArea(
          d,
          d.devices.find((v) => v.id === (item as Port).deviceId)?.areaId || '',
          areaId,
        );
      if (tab === 'connections') {
        const cable = item as Connection;
        return [cable.source.deviceId, cable.target.deviceId].some((id) =>
          withinArea(d, d.devices.find((v) => v.id === id)?.areaId || '', areaId),
        );
      }
      return withinArea(d, (item as Device).areaId, areaId);
    });
  }

  const visibleItems: NetworkItem[] = document ? visibleFor(document) : [];

  const tiles: {
    key: Collection | 'unresolved';
    label: string;
    count: number;
    icon: LucideIcon;
    warn?: boolean;
  }[] = document
    ? [
        { key: 'areas', label: 'Areas', count: document.areas.length, icon: Building2 },
        { key: 'racks', label: 'Racks', count: document.racks.length, icon: LayoutGrid },
        { key: 'devices', label: 'Devices', count: document.devices.length, icon: Boxes },
        { key: 'ports', label: 'Ports', count: document.ports.length, icon: Plug },
        { key: 'connections', label: 'Cables', count: document.connections.length, icon: Cable },
        {
          key: 'unresolved',
          label: 'Cables missing ports',
          count: unresolved,
          icon: TriangleAlert,
          warn: true,
        },
      ]
    : [];

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 p-6">
      <PageHeader
        title="Network"
        description="Map sites, racks, equipment, ports and cables. Edits are a draft until you save."
        actions={
          <>
            <Link
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
              to="/network/racks"
            >
              Manage racks
            </Link>
            <Link
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
              to="/network/areas"
            >
              Manage areas
            </Link>
            <StatusPill tone={dirty ? 'warn' : revision ? 'ok' : 'neutral'}>
              {dirty ? 'Unsaved changes' : revision ? `Saved · revision ${revision}` : 'Loading…'}
            </StatusPill>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void load()}>
              <RefreshCw />
              Reload
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!document || busy}
                  aria-label="Import and export"
                >
                  <MoreHorizontal />
                  Data
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => file.current?.click()}>
                  <Upload />
                  Import JSON
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={exportJSON} disabled={!document}>
                  <Download />
                  Export JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              disabled={!dirty || !document || busy}
              loading={busy}
              onClick={() => void save()}
            >
              <Save />
              Save network
            </Button>
          </>
        }
      />

      <input
        ref={file}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-label="Import network JSON file"
        onChange={(e) => {
          if (e.target.files?.[0]) void importJSON(e.target.files[0]);
          e.target.value = '';
        }}
      />

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!document ? (
        busy || !error ? (
          <div
            className="h-[640px] animate-pulse rounded-xl border border-border bg-card"
            role="status"
            aria-live="polite"
          >
            <span className="sr-only">Loading network…</span>
          </div>
        ) : (
          <EmptyState
            title="The network could not be loaded"
            description="Check your connection, then try again."
            action={
              <Button variant="outline" onClick={() => void load()}>
                <RefreshCw />
                Try again
              </Button>
            }
          />
        )
      ) : (
        <>
          {/* Stat tiles double as navigation for the explorer */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {tiles.map((tile) => {
              const Icon = tile.icon;
              const active = !tile.warn && tab === tile.key;
              const attention = tile.warn && tile.count > 0;
              return (
                <button
                  key={tile.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    if (tile.warn) {
                      setTab('connections');
                      setQuery('');
                    } else setTab(tile.key as Collection);
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'border-primary bg-primary/5'
                      : attention
                        ? 'border-warning-border bg-warning-muted/60 hover:bg-warning-muted'
                        : 'border-border bg-card hover:bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      attention
                        ? 'bg-warning text-warning-foreground'
                        : active
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-lg font-semibold tabular-nums leading-tight text-foreground">
                      {tile.count}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {tile.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Toolbar: find, filter, change mode, act on the selection */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-card">
            <div className="relative w-full sm:w-72">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                aria-label="Search network"
                placeholder="Search names, codes or IPs"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 rounded-full pl-9"
              />
            </div>

            <ToolbarSelect
              label="Filter by physical area"
              value={areaId}
              emptyLabel="All areas"
              options={document.areas.map((a) => ({ value: a.id, label: a.name }))}
              onChange={setAreaId}
            />

            <SegmentedControl
              label="Canvas mode"
              value={mode}
              onChange={enterMode}
              options={MODE_OPTIONS}
            />

            <Button
              variant={showExplorer ? 'secondary' : 'outline'}
              size="sm"
              aria-pressed={showExplorer}
              aria-controls="network-explorer"
              title={showExplorer ? 'Hide racks panel' : 'Show racks panel'}
              onClick={() => setShowExplorer((visible) => !visible)}
            >
              <PanelLeft />
              Racks
            </Button>
            <Button
              variant={showInspector ? 'secondary' : 'outline'}
              size="sm"
              aria-pressed={showInspector}
              aria-controls="network-inspector"
              title={
                showInspector
                  ? 'Hide network health and details panel'
                  : 'Show network health and details panel'
              }
              onClick={() => setShowInspector((visible) => !visible)}
            >
              <PanelRight />
              Health &amp; details
            </Button>

            <div className="ml-auto flex flex-wrap items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Undo"
                title="Undo (Ctrl+Z)"
                disabled={!history.current.length}
                onClick={undo}
              >
                <Undo2 />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Redo"
                title="Redo (Ctrl+Shift+Z)"
                disabled={!redo.current.length}
                onClick={redoEdit}
              >
                <Redo2 />
              </Button>
              <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
              <Button variant="outline" size="sm" onClick={() => setFitKey((k) => k + 1)}>
                <Maximize2 />
                Fit view
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedDevice}
                onClick={() => setTraceId(selectedDevice || '')}
              >
                <Route />
                Trace to core
              </Button>
              {traceId && (
                <Button variant="ghost" size="sm" onClick={() => setTraceId('')}>
                  Clear trace
                </Button>
              )}
            </div>
          </div>

          {linking && (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-info-border bg-info-muted px-3 py-2 text-sm text-info-strong"
            >
              <span>
                {pending
                  ? `Cable from ${endLabel(document, pending)}. Choose the destination device or a free port.`
                  : 'Choose the first device or a free numbered port, then the destination.'}
              </span>
              <Button size="xs" variant="outline" onClick={() => enterMode('select')}>
                Cancel
              </Button>
            </div>
          )}
          {dimensionMode && (
            <p role="status" className="px-1 text-sm text-muted-foreground">
              Click two points on the map to measure their distance. Press Esc to stop.
            </p>
          )}
          {traceId && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-xs">
              <span className="font-semibold text-foreground">Route to core</span>
              {trace === null ? (
                <span className="text-muted-foreground">No route recorded.</span>
              ) : trace.length === 0 ? (
                <span className="text-muted-foreground">Selected equipment is a core switch.</span>
              ) : (
                trace.map((c, i) => (
                  <Button
                    key={c.id}
                    size="xs"
                    variant="outline"
                    onClick={() => select({ collection: 'connections', id: c.id })}
                  >
                    {i + 1}. {c.cableCode || c.kind} · {c.verification}
                  </Button>
                ))
              )}
              <span className="text-muted-foreground">
                Uses documented links only. It does not test live reachability.
              </span>
            </div>
          )}

          {/* Workspace: explorer | map | inspector */}
          <div
            className={cn(
              'grid gap-4 xl:h-[calc(100dvh-22rem)] xl:min-h-[640px]',
              showExplorer &&
                showInspector &&
                'xl:grid-cols-[260px_minmax(0,1fr)_320px] 2xl:grid-cols-[300px_minmax(0,1fr)_360px]',
              showExplorer &&
                !showInspector &&
                'xl:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)]',
              !showExplorer &&
                showInspector &&
                'xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]',
              !showExplorer && !showInspector && 'grid-cols-[minmax(0,1fr)]',
            )}
          >
            <aside
              id="network-explorer"
              className={cn(
                'h-[460px] min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card xl:h-full',
                showExplorer ? 'flex' : 'hidden',
              )}
              aria-label="Network explorer"
            >
              <NetworkExplorer
                document={document}
                tab={tab}
                items={visibleItems}
                selection={selection}
                onSelect={select}
                onAdd={add}
                hasFilters={hasFilters}
              />
            </aside>

            <div className="h-[560px] min-w-0 xl:h-full">
              <NetworkCanvas
                document={document}
                onChange={change}
                selection={selection}
                select={select}
                query={query}
                areaId={areaId}
                trace={trace?.map((c) => c.id) || []}
                fitKey={fitKey}
                linking={linking}
                onPort={clickPort}
                showAreas={showAreas}
                showLabels={showLabels}
                grid={grid}
                snap={snap}
                compactRackConnections={compactRackConnections}
                dimensionMode={dimensionMode}
                onDimension={(a, b) =>
                  change({ ...document, dims: [...document.dims, { uid: uid(), a, b, off: 40 }] })
                }
                onFit={() => setFitKey((k) => k + 1)}
                overlay={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-card shadow-card">
                        <Eye />
                        View
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Show on map</DropdownMenuLabel>
                      <DropdownMenuCheckboxItem checked={showAreas} onCheckedChange={setShowAreas}>
                        Area boundaries
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={showLabels}
                        onCheckedChange={setShowLabels}
                      >
                        Cable codes
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={grid} onCheckedChange={setGrid}>
                        Background grid
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem checked={snap} onCheckedChange={setSnap}>
                        Snap to grid
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Rack movement</DropdownMenuLabel>
                      <DropdownMenuCheckboxItem
                        checked={compactRackConnections}
                        onCheckedChange={setCompactRackConnections}
                      >
                        Keep connections near rack
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => setFitKey((k) => k + 1)}>
                        <Maximize2 />
                        Fit network to view
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              />
            </div>

            <aside
              id="network-inspector"
              className={cn(
                'h-[460px] min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card xl:h-full',
                showInspector ? 'flex' : 'hidden',
              )}
              aria-label="Network inspector"
            >
              <NetworkInspector
                document={document}
                selection={selection}
                onChange={change}
                onDelete={() => void remove()}
                select={select}
                onTrace={setTraceId}
                onAddPort={addPort}
              />
            </aside>
          </div>

          <p className="text-xs text-muted-foreground">
            Shortcuts: V select · C connect · M measure · F fit · Esc cancel · Delete remove ·
            Ctrl+Z undo · Ctrl+S save
          </p>
        </>
      )}
    </div>
  );
}

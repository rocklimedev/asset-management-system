import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, RefreshCw } from 'lucide-react';
import { NetworkAutosave, type SaveState } from '../components/network/autosave';
import { useLazyNetworkQuery, useSaveNetworkMutation } from '../services/api/network.api';
import { useAuth } from '../services/context/AuthContext';
import type { NetworkDocument } from '../types/network';
import type { Selection } from '../components/network/NetworkCanvas';
import { NetworkExplorer } from '../components/network/NetworkExplorer';
import { NetworkInspector } from '../components/network/NetworkInspector';
import { deletionReason, uid, withinArea } from '../components/network/topology';
import { PageHeader } from '../components/layout/PageHeader';
import { Button, buttonVariants } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusPill } from '../components/list/StatusPill';
import { useConfirm } from '../components/ui/confirm-dialog';
import { toast } from '../components/ui/toast';

function requestError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'data' in error) {
    const data = error.data as { message?: string | string[] } | null;
    if (Array.isArray(data?.message)) return data.message.join(', ');
    if (typeof data?.message === 'string') return data.message;
  }
  return fallback;
}

export default function NetworkDirectory({ collection }: { collection: 'racks' | 'areas' }) {
  const { accessToken } = useAuth();
  const [fetchNetwork] = useLazyNetworkQuery();
  const [saveNetwork] = useSaveNetworkMutation();
  const confirm = useConfirm();
  const [document, setDocument] = useState<NetworkDocument | null>(null);
  const [baseline, setBaseline] = useState('');
  const [revision, setRevision] = useState(0);
  const [selection, setSelection] = useState<Selection>(null);
  const [query, setQuery] = useState('');
  const [areaId, setAreaId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [saveError, setSaveError] = useState('');
  const autosave = useRef<NetworkAutosave | null>(null);
  const loadSequence = useRef(0);
  const serialized = document ? JSON.stringify(document) : '';
  const dirty = !!document && serialized !== baseline;
  const title = collection === 'racks' ? 'Network Racks' : 'Network Areas';

  async function load() {
    if (
      dirty &&
      !(await confirm({
        title: 'Discard unsaved changes?',
        description: 'Reloading replaces your draft with the saved network.',
        confirmLabel: 'Discard and reload',
        tone: 'danger',
      }))
    )
      return;
    setBusy(true);
    setError('');
    const sequence = ++loadSequence.current;
    try {
      await autosave.current?.dispose();
      const data = await fetchNetwork().unwrap();
      if (sequence !== loadSequence.current) return;
      autosave.current = new NetworkAutosave(
        { revision: data.revision, snapshot: JSON.stringify(data.document) },
        async (snapshot, revision) => {
          try {
            const saved = await saveNetwork({ document: JSON.parse(snapshot), revision }).unwrap();
            return { revision: saved.revision, snapshot };
          } catch (error) {
            throw Object.assign(new Error(requestError(error, 'Could not save changes.')),
              { status: (error as { status?: number }).status });
          }
        },
        async () => {
          const saved = await fetchNetwork().unwrap();
          return { revision: saved.revision, snapshot: JSON.stringify(saved.document) };
        },
        (state, version, message) => {
          if (sequence !== loadSequence.current) return;
          setSaveState(state);
          setSaveError(message || '');
          if (version) {
            setRevision(version.revision);
            setBaseline(version.snapshot);
          }
        },
      );
      setSaveState('saved');
      setSaveError('');
      setDocument(structuredClone(data.document));
      setBaseline(JSON.stringify(data.document));
      setRevision(data.revision);
      setSelection(null);
    } catch (e) {
      if (sequence !== loadSequence.current) return;
      setError(requestError(e, 'Could not load network.'));
      if (document) {
        setSaveState('error');
        setSaveError('Automatic saving is paused because reload failed. Export your edits or retry Reload.');
      }
    } finally {
      if (sequence === loadSequence.current) setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    return () => {
      loadSequence.current++;
      void autosave.current?.dispose();
    };
  }, [accessToken]);
  useEffect(() => {
    if (document && !busy) autosave.current?.update(serialized);
  }, [serialized, busy]);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const navigate = (event: MouseEvent) => {
      if (
        dirty &&
        (event.target as Element).closest('a') &&
        !window.confirm('Leave with unsaved network edits?')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', before);
    window.document.addEventListener('click', navigate, true);
    return () => {
      window.removeEventListener('beforeunload', before);
      window.document.removeEventListener('click', navigate, true);
    };
  }, [dirty]);

  function exportJSON() {
    if (!document) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }));
    const link = window.document.createElement('a');
    link.href = url;
    link.download = 'office-network.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  function add() {
    if (!document || busy) return;
    const next = structuredClone(document),
      id = uid();
    if (collection === 'areas')
      next.areas.push({ id, name: 'New area', parentId: areaId || null, notes: '', x: 0, y: 0 });
    else {
      const targetArea = areaId || next.areas[0]?.id;
      if (!targetArea) {
        setError('Create a network area before adding a rack.');
        return;
      }
      next.racks.push({ id, name: 'New rack', areaId: targetArea, notes: '', x: 0, y: 0 });
    }
    setDocument(next);
    setQuery('');
    setSelection({ collection, id });
    setError('');
  }

  async function remove() {
    if (!document || !selection || busy) return;
    const reason = deletionReason(document, selection.collection, selection.id);
    if (reason) {
      setError(reason);
      return;
    }
    if (
      !(await confirm({
        title: 'Delete selected item?',
        description: 'The removal will save automatically.',
        confirmLabel: 'Delete',
        tone: 'danger',
      }))
    )
      return;
    const next = structuredClone(document);
    const lists = next as unknown as Record<string, Array<{ id: string }>>;
    lists[selection.collection] = lists[selection.collection].filter((v) => v.id !== selection.id);
    if (selection.collection === 'devices')
      next.ports = next.ports.filter((p) => p.deviceId !== selection.id);
    setDocument(next);
    setSelection(null);
    setError('');
  }

  function addPort(deviceId: string) {
    if (!document || busy) return;
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
    setDocument(next);
    setSelection({ collection: 'ports', id });
  }

  const items =
    document?.[collection].filter(
      (item) =>
        withinArea(document, 'areaId' in item ? item.areaId : item.id, areaId) &&
        `${item.name} ${item.notes} ${'areaId' in item ? document.areas.find((a) => a.id === item.areaId)?.name || '' : ''}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    ) || [];

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4 p-6">
      <PageHeader
        title={title}
        description={
          collection === 'racks'
            ? 'Manage racks, their physical areas and equipment. Changes save automatically.'
            : 'Manage physical areas and their hierarchy. Changes save automatically.'
        }
        actions={
          <>
            <span role="status" aria-live="polite">
              <StatusPill tone={saveError ? 'warn' : dirty ? 'neutral' : 'ok'}>
                {saveState === 'conflict' ? 'Save conflict' : saveState === 'error' ? 'Save failed'
                  : saveState === 'retrying' ? 'Retrying save…' : saveState === 'saving' ? 'Saving…'
                    : dirty ? 'Changes pending…' : document ? `Saved · revision ${revision}` : 'Loading…'}
              </StatusPill>
            </span>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void load()}>
              <RefreshCw />
              Reload
            </Button>
            <Button variant="outline" size="sm" disabled={!document} onClick={exportJSON}>
              <Download />
              Export JSON
            </Button>
          </>
        }
      />
      <nav aria-label="Network pages" className="flex flex-wrap gap-2">
        <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} to="/network">
          Network map
        </Link>
        <Link
          className={buttonVariants({
            variant: collection === 'racks' ? 'secondary' : 'outline',
            size: 'sm',
          })}
          to="/network/racks"
          aria-current={collection === 'racks' ? 'page' : undefined}
        >
          Racks
        </Link>
        <Link
          className={buttonVariants({
            variant: collection === 'areas' ? 'secondary' : 'outline',
            size: 'sm',
          })}
          to="/network/areas"
          aria-current={collection === 'areas' ? 'page' : undefined}
        >
          Areas
        </Link>
      </nav>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {saveError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}
      {!document ? (
        <EmptyState
          title={busy ? 'Loading network…' : 'Network unavailable'}
          description="Use Reload to fetch the saved network."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-3">
            <Input
              type="search"
              aria-label={`Search ${collection}`}
              placeholder={`Search ${collection}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="sm:max-w-sm"
            />
            <select
              aria-label="Filter by area"
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
            >
              <option value="">All areas</option>
              {document.areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)]">
            <section
              aria-label={title}
              className="h-[640px] overflow-hidden rounded-xl border border-border bg-card shadow-card"
            >
              <NetworkExplorer
                document={document}
                tab={collection}
                items={items}
                selection={selection}
                onSelect={setSelection}
                onAdd={add}
                hasFilters={!!query || !!areaId}
              />
            </section>
            <aside
              aria-label="Selected item details"
              className="h-[640px] overflow-hidden rounded-xl border border-border bg-card shadow-card"
            >
              {selection ? (
                <NetworkInspector
                  document={document}
                  selection={selection}
                  onChange={(next) => { if (!busy) setDocument(next); }}
                  onDelete={() => void remove()}
                  select={setSelection}
                  onTrace={() =>
                    toast.add({ title: 'Open the network map to trace routes', type: 'info' })
                  }
                  onAddPort={addPort}
                />
              ) : (
                <div className="p-6">
                  <EmptyState
                    title={`Select ${collection === 'racks' ? 'a rack' : 'an area'}`}
                    description="Choose an item to view and edit its details, or add a new one."
                  />
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

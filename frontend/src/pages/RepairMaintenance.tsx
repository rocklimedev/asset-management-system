import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Plus, RefreshCw, Wrench } from 'lucide-react';
import { useGetAssetUnitsQuery, useUpdateAssetUnitStatusMutation, type AssetUnit, type AssetUnitStatus } from '../services/api/asset.api';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { EmptyState, SkeletonCard } from '../components/ui/EmptyState';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from '../components/ui/toast';

const PAGE_SIZE = 25;
export default function RepairMaintenance() {
  const [status, setStatus] = useState<'REPAIR' | 'DAMAGED'>('REPAIR');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [startOpen, setStartOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateStatus, setCandidateStatus] = useState<'AVAILABLE' | 'DAMAGED'>('AVAILABLE');
  const [candidatePage, setCandidatePage] = useState(1);
  const [selected, setSelected] = useState<AssetUnit | null>(null);
  const [targetStatus, setTargetStatus] = useState<AssetUnitStatus>('REPAIR');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [changeStatus, mutation] = useUpdateAssetUnitStatusMutation();
  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 250); return () => clearTimeout(timer); }, [search]);
  const list = useGetAssetUnitsQuery({ status, search: query || undefined, page, pageSize: PAGE_SIZE });
  const repairCount = useGetAssetUnitsQuery({ status: 'REPAIR', pageSize: 1 });
  const damagedCount = useGetAssetUnitsQuery({ status: 'DAMAGED', pageSize: 1 });
  const candidates = useGetAssetUnitsQuery({ status: candidateStatus, search: candidateSearch.trim() || undefined, page: candidatePage, pageSize: PAGE_SIZE }, { skip: !startOpen });
  const data = list.currentData;
  useEffect(() => { if (data && page > Math.max(1, data.totalPages)) setPage(Math.max(1, data.totalPages)); }, [data, page]);
  function openStart() { setSelected(null); setNotes(''); setError(''); setTargetStatus('REPAIR'); setCandidatePage(1); setCandidateSearch(''); setStartOpen(true); }
  function openAction(unit: AssetUnit, next: AssetUnitStatus) { setSelected(unit); setNotes(''); setError(''); setTargetStatus(next); }
  function close() { if (!mutation.isLoading) { setStartOpen(false); setSelected(null); setError(''); } }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!selected || mutation.isLoading || !notes.trim()) return;
    setError('');
    try {
      await changeStatus({ id: selected.id, status: targetStatus, notes: notes.trim() }).unwrap();
      toast.add({ title: targetStatus === 'REPAIR' ? 'Repair / maintenance started' : targetStatus === 'AVAILABLE' ? 'Maintenance completed — asset available' : 'Asset marked damaged', type: 'success' });
      setStartOpen(false); setSelected(null); setNotes('');
    } catch (e) { setError((e as { data?: { message?: string } }).data?.message || 'Could not update this unit. Please try again.'); }
  }
  return <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <PageHeader title="Repair & Maintenance" description="Track equipment under repair, review damaged items, and return serviced units to inventory."
      actions={<><Button variant="outline" disabled={list.isFetching} onClick={() => { list.refetch(); repairCount.refetch(); damagedCount.refetch(); }}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button><Button onClick={openStart}><Plus className="mr-2 h-4 w-4" />Start maintenance</Button></>} />
    <div className="grid gap-4 sm:grid-cols-2">
      {[{ label: 'In repair / maintenance', count: repairCount.currentData?.total, failed: repairCount.isError, value: 'REPAIR' as const }, { label: 'Damaged — needs attention', count: damagedCount.currentData?.total, failed: damagedCount.isError, value: 'DAMAGED' as const }].map(item => <button key={item.value} type="button" onClick={() => { setStatus(item.value); setPage(1); }} className="rounded-xl border bg-card p-5 text-left hover:bg-muted" aria-pressed={status === item.value}>
        <span className="text-sm text-muted-foreground">{item.label}</span><span className="mt-2 block text-3xl font-semibold">{item.failed ? 'Unavailable' : item.count ?? '…'}</span><span className="mt-1 block text-xs text-muted-foreground">Individual asset units · all inventory</span>
      </button>)}
    </div>
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2" aria-label="Maintenance status">
          {(['REPAIR', 'DAMAGED'] as const).map(value => <Button key={value} variant={status === value ? 'default' : 'outline'} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); }}>{value === 'REPAIR' ? 'In repair / maintenance' : 'Damaged'}</Button>)}
        </div>
        <Input className="sm:max-w-xs" aria-label="Search repair and maintenance assets" placeholder="Search asset, tag, unit or serial…" value={search} onChange={event => setSearch(event.target.value)} />
      </div>
      {list.isError ? <EmptyState title="Could not load maintenance assets" description="Try loading the list again." action={<Button onClick={() => list.refetch()}>Retry</Button>} /> : !data ? <SkeletonCard /> : !data.items.length ? <EmptyState icon={Wrench} title={query ? 'No matching units' : status === 'REPAIR' ? 'No assets currently in repair' : 'No damaged assets'} description={query ? 'Try a different asset name, tag or serial number.' : 'Start maintenance to record work on an available or damaged unit.'} action={<Button onClick={openStart}>Start maintenance</Button>} /> : <>
        <div className="overflow-x-auto" aria-busy={list.isFetching}>
          <table className="w-full text-left text-sm">
            <thead className="border-b text-xs text-muted-foreground"><tr>{['Asset / unit', 'Serial number', 'Location', 'Status', 'Maintenance notes', 'Updated', 'Actions'].map(label => <th key={label} className="px-3 py-3 font-medium">{label}</th>)}</tr></thead>
            <tbody className="divide-y">{data.items.map(unit => <tr key={unit.id} className="hover:bg-muted/40">
              <td className="px-3 py-4"><Link className="font-medium underline underline-offset-4" to={'/inventory?assetId=' + encodeURIComponent(unit.assetId)}>{unit.asset?.name || 'View asset'}</Link><p className="mt-1 text-xs text-muted-foreground">{unit.unitCode || unit.id}{unit.asset?.assetTag ? ' · ' + unit.asset.assetTag : ''}</p></td>
              <td className="px-3 py-4">{unit.serialNumber || '—'}</td><td className="px-3 py-4">{unit.location?.name || '—'}</td>
              <td className="px-3 py-4"><Badge variant="outline">{unit.status === 'REPAIR' ? 'In repair' : 'Damaged'}</Badge></td>
              <td className="max-w-xs whitespace-pre-wrap break-words px-3 py-4">{unit.notes || '—'}</td>
              <td className="whitespace-nowrap px-3 py-4">{unit.updatedAt ? new Date(unit.updatedAt).toLocaleDateString() : '—'}</td>
              <td className="px-3 py-4"><div className="flex flex-wrap gap-2">{unit.status === 'REPAIR' ? <><Button size="sm" variant="outline" disabled={mutation.isLoading} onClick={() => openAction(unit, 'AVAILABLE')}><CheckCircle2 className="mr-1 h-4 w-4" />Complete</Button><Button size="sm" variant="ghost" disabled={mutation.isLoading} onClick={() => openAction(unit, 'DAMAGED')}>Mark damaged</Button></> : <Button size="sm" variant="outline" disabled={mutation.isLoading} onClick={() => openAction(unit, 'REPAIR')}>Start repair</Button>}</div></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{data.total} matching unit{data.total === 1 ? '' : 's'} · Page {page} of {Math.max(1, data.totalPages)}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1 || list.isFetching} onClick={() => setPage(current => current - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={page >= data.totalPages || list.isFetching} onClick={() => setPage(current => current + 1)}>Next</Button></div></div>
      </>}
    </section>
    <Dialog open={startOpen || Boolean(selected)} onOpenChange={value => { if (!value) close(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{targetStatus === 'AVAILABLE' ? 'Complete maintenance' : targetStatus === 'DAMAGED' ? 'Mark asset damaged' : 'Start repair / maintenance'}</DialogTitle><DialogDescription>{selected ? (selected.asset?.name || 'Asset') + ' · ' + (selected.unitCode || selected.serialNumber || selected.id) : 'Choose an available or damaged unit. Return assigned equipment before starting maintenance.'}</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          {startOpen && <div className="space-y-3">
            <label className="block text-sm">Find units<Input disabled={mutation.isLoading} value={candidateSearch} placeholder="Asset name, tag or serial" onChange={event => { setCandidateSearch(event.target.value); setCandidatePage(1); setSelected(null); }} /></label>
            <label className="block text-sm">Current status<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" disabled={mutation.isLoading} value={candidateStatus} onChange={event => { setCandidateStatus(event.target.value as 'AVAILABLE' | 'DAMAGED'); setCandidatePage(1); setSelected(null); }}><option value="AVAILABLE">Available</option><option value="DAMAGED">Damaged</option></select></label>
            <label className="block text-sm">Asset unit<select required className="mt-1 h-10 w-full rounded-md border bg-background px-3" disabled={mutation.isLoading || candidates.isFetching} value={selected?.id || ''} onChange={event => setSelected(candidates.currentData?.items.find(unit => unit.id === event.target.value) || null)}><option value="">Choose a unit</option>{candidates.currentData?.items.map(unit => <option key={unit.id} value={unit.id}>{unit.asset?.name} · {unit.unitCode || unit.serialNumber || unit.id}</option>)}</select></label>
            {candidates.isError && <p role="alert" className="text-sm text-destructive">Could not load units. <button type="button" className="underline" onClick={() => candidates.refetch()}>Retry</button></p>}
            {candidates.currentData?.items.length === 0 && <p className="text-xs text-muted-foreground">No units match. Try another search or status.</p>}
            <div className="flex justify-between"><Button type="button" size="sm" variant="outline" disabled={candidatePage <= 1 || candidates.isFetching || mutation.isLoading} onClick={() => { setCandidatePage(current => current - 1); setSelected(null); }}>Previous</Button><Button type="button" size="sm" variant="outline" disabled={!candidates.currentData || candidatePage >= candidates.currentData.totalPages || candidates.isFetching || mutation.isLoading} onClick={() => { setCandidatePage(current => current + 1); setSelected(null); }}>Next</Button></div>
          </div>}
          <label className="block space-y-1 text-sm"><span>{targetStatus === 'AVAILABLE' ? 'Work completed / service notes' : 'Issue / maintenance notes'}</span><Textarea required maxLength={5000} disabled={mutation.isLoading} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Describe the issue or work completed. Include the service provider or reference if useful." /></label>
          <p className="text-xs text-muted-foreground">This change and your notes are saved in the asset history.</p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={mutation.isLoading} onClick={close}>Cancel</Button><Button type="submit" disabled={!selected || !notes.trim() || mutation.isLoading}>{mutation.isLoading ? 'Saving…' : 'Save maintenance status'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}

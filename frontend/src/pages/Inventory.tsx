import { useState } from 'react';
import { Search, Plus, ArrowUpDown } from 'lucide-react';
import { useAssets } from '../lib/hooks';
import { StatusBadge } from '../components/ui/Badge';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { EmptyState, SkeletonCard } from '../components/ui/EmptyState';
import { AssetDetailDrawer } from '../components/asset-manager/AssetDetailDrawer';
import type { Asset } from '../types';

const STATUS_OPTIONS = ['AVAILABLE', 'ASSIGNED', 'REPAIR', 'LOST', 'DAMAGED', 'RETIRED', 'DISPOSED'];

const COLUMNS: { key: string; label: string; sortable?: boolean }[] = [
  { key: 'assetTag', label: 'Asset ID', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'category', label: 'Category' },
  { key: 'serialNumber', label: 'Serial number' },
  { key: 'assignedTo', label: 'Assigned to' },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'condition', label: 'Condition' },
  { key: 'warrantyExpiry', label: 'Warranty', sortable: true },
];

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const [sortBy, setSortBy] = useState('assetTag');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Asset | null>(null);

  const { data, isLoading } = useAssets({
    search: search || undefined, status: status || undefined, kind: kind || undefined, sortBy, sortDir, page,
  });

  function toggleSort(key: string) {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('asc'); }
  }

  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">All hardware and software assets, regardless of assignment.</p>
        </div>
        <Button className="w-fit"><Plus className="h-4 w-4" /> Add Asset</Button>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Asset ID, serial number, name, employee..." className="pl-9" />
        </div>
        <Select value={kind} onChange={(e) => { setKind(e.target.value); setPage(1); }} className="w-full sm:w-40">
          <option value="">All types</option>
          <option value="HARDWARE">Hardware</option>
          <option value="SOFTWARE">Software</option>
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-full sm:w-44">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="No assets found" description="Try changing your filters, or add a new asset." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col.key} className="whitespace-nowrap px-4 py-2.5 font-medium">
                      {col.sortable ? (
                        <button onClick={() => toggleSort(col.key)} className="flex items-center gap-1 hover:text-slate-700">
                          {col.label} <ArrowUpDown className="h-3 w-3" />
                        </button>
                      ) : col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((asset) => {
                  const assignee = asset.assignments?.[0]?.employee;
                  return (
                    <tr key={asset.id} onClick={() => setSelected(asset)} className="cursor-pointer hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-600">{asset.assetTag}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-800">{asset.name}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{asset.category?.name ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-500">{asset.serialNumber ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{assignee?.name ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2.5"><StatusBadge status={asset.status} /></td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{asset.condition}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {items.length} of {data?.total ?? 0} assets</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={(data?.total ?? 0) <= page * (data?.pageSize ?? 25)} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}

      <AssetDetailDrawer asset={selected} onClose={() => setSelected(null)} onTransfer={() => {}} />
    </div>
  );
}

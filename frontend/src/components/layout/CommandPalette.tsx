import { Search, User, Package } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployees } from '../../lib/hooks';
import { useAssets } from '../../lib/hooks';

// Global search palette (Ctrl/Cmd+K). Searches employees and assets together.
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { data: employees } = useEmployees({ search: query || undefined });
  const { data: assets } = useAssets(query ? { search: query } : {});

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search employees or assets..."
            className="w-full text-sm outline-none placeholder:text-slate-400"
          />
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {query.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate-400">Start typing to search across the workspace.</p>}
          {employees?.items && employees.items.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-400">Employees</p>
              {employees.items.slice(0, 5).map((e) => (
                <button
                  key={e.id}
                  onClick={() => { navigate(`/asset-manager?employee=${e.id}`); onClose(); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-800">{e.name}</span>
                  <span className="text-slate-400">{e.department?.name}</span>
                </button>
              ))}
            </div>
          )}
          {assets?.items && assets.items.length > 0 && (
            <div>
              <p className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-400">Assets</p>
              {assets.items.slice(0, 5).map((a) => (
                <button
                  key={a.id}
                  onClick={() => { navigate(`/inventory?assetId=${a.id}`); onClose(); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <Package className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-800">{a.name}</span>
                  <span className="text-slate-400 tabular-nums">{a.assetTag}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

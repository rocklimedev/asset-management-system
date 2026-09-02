import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Select, Textarea } from '../ui/Input';
import type { Asset, Employee } from '../../types';

const REASONS = ['Employee transfer', 'Team reassignment', 'Manager request', 'Equipment upgrade', 'Other'];

export function TransferModal({
  open, onClose, asset, fromEmployee, toEmployee, employeeOptions, onSelectEmployee, onConfirm, loading,
}: {
  open: boolean;
  onClose: () => void;
  asset: Asset | null;
  fromEmployee: Employee | null;
  toEmployee: Employee | null;
  /** When provided, renders a destination-employee picker instead of a fixed target (the non-drag "Actions > Transfer" fallback). */
  employeeOptions?: Employee[];
  onSelectEmployee?: (employeeId: number) => void;
  onConfirm: (reason: string, notes: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState('');

  if (!asset) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Transfer asset"
      description={toEmployee ? `You are about to transfer this asset to ${toEmployee.name}.` : 'Choose who this asset should be transferred to.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={() => onConfirm(reason, notes)} loading={loading} disabled={!toEmployee}>Confirm transfer</Button>
        </>
      }
    >
      <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-medium text-slate-900">{asset.name}</p>
        <p className="text-xs text-slate-500 tabular-nums">Asset ID: {asset.assetTag}</p>
      </div>

      <div className="mb-4 flex items-center gap-3 text-sm">
        <div className="flex-1 rounded-lg border border-slate-200 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">From</p>
          <p className="mt-0.5 font-medium text-slate-800">{fromEmployee?.name ?? 'Unassigned'}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
        <div className="flex-1 rounded-lg border border-brand-200 bg-brand-50 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-brand-500">To</p>
          {employeeOptions ? (
            <select
              value={toEmployee?.id ?? ''}
              onChange={(e) => onSelectEmployee?.(Number(e.target.value))}
              className="mt-1 w-full rounded-md border-0 bg-transparent p-0 text-sm font-medium text-brand-800 focus:outline-none focus:ring-0"
            >
              <option value="" disabled>Select an employee...</option>
              {employeeOptions
                .filter((e) => e.id !== fromEmployee?.id)
                .map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          ) : (
            <p className="mt-0.5 font-medium text-brand-800">{toEmployee?.name}</p>
          )}
        </div>
      </div>

      <label className="mb-1 block text-xs font-medium text-slate-600">Reason</label>
      <Select value={reason} onChange={(e) => setReason(e.target.value)} className="mb-3">
        {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </Select>

      <label className="mb-1 block text-xs font-medium text-slate-600">Notes (optional)</label>
      <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any context for this transfer..." />
    </Dialog>
  );
}

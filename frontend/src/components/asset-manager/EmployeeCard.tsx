import { useDroppable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { Laptop, AppWindow, MoreHorizontal, MapPin } from 'lucide-react';
import { useState } from 'react';
import type { Asset, Employee } from '../../types';
import { AssetChip } from './AssetChip';
import { EmptyState } from '../ui/EmptyState';

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export function EmployeeCard({
  employee, activeAssetId, onOpenDetail, onTransferClick,
}: {
  employee: Employee;
  activeAssetId: number | null;
  onOpenDetail: (asset: Asset) => void;
  onTransferClick: (asset: Asset) => void;
}) {
  const { setNodeRef, isOver, active } = useDroppable({ id: `employee-${employee.id}`, data: { employee } });
  const [menuOpenFor, setMenuOpenFor] = useState<number | null>(null);

  const assignments = employee.assignments ?? [];
  const hardware = assignments.filter((a) => a.asset?.kind === 'HARDWARE');
  const software = assignments.filter((a) => a.asset?.kind === 'SOFTWARE');

  const draggingAsset = active?.data.current?.asset as Asset | undefined;
  const isValidDrop = draggingAsset ? draggingAsset.assignments?.[0]?.employeeId !== employee.id : false;
  const isInvalidHover = isOver && draggingAsset && !isValidDrop;

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex flex-col rounded-xl border bg-white p-4 transition-all',
        isOver && isValidDrop && 'border-brand-400 ring-2 ring-brand-100',
        isInvalidHover && 'border-rose-300 ring-2 ring-rose-100',
        !isOver && 'border-slate-200',
      )}
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
          {initials(employee.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{employee.name}</p>
          <p className="truncate text-xs text-slate-500">{employee.designation ?? '—'}</p>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
            <span>{employee.department?.name ?? 'Unassigned dept.'}</span>
            {employee.location && (
              <>
                <span>·</span>
                <MapPin className="h-3 w-3" />
                <span>{employee.location.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            <Laptop className="h-3 w-3" /> Hardware ({hardware.length})
          </div>
          {hardware.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-2.5 py-2 text-xs text-slate-400">No hardware assigned.</p>
          ) : (
            <div className="space-y-1.5">
              {hardware.map((a) => a.asset && (
                <AssetChip key={a.id} asset={a.asset} onOpenDetail={onOpenDetail} transferrable={a.asset.status === 'ASSIGNED'} />
              ))}
            </div>
          )}
        </div>

        {software.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              <AppWindow className="h-3 w-3" /> Software ({software.length})
            </div>
            <div className="space-y-1.5">
              {software.map((a) => a.asset && (
                <AssetChip key={a.id} asset={a.asset} onOpenDetail={onOpenDetail} transferrable={false} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
        <span className="text-xs text-slate-400">{assignments.length} asset{assignments.length !== 1 ? 's' : ''} total</span>
        <span className="text-xs font-medium text-brand-600">{hardware.length}HW · {software.length}SW</span>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { Search, Plus, Laptop } from 'lucide-react';
import { useEmployees } from '../lib/hooks';
import { useTransferAsset } from '../lib/hooks';
import { useToastStore } from '../components/ui/Toast';
import { EmployeeCard } from '../components/asset-manager/EmployeeCard';
import { AssetChip } from '../components/asset-manager/AssetChip';
import { TransferModal } from '../components/asset-manager/TransferModal';
import { AssetDetailDrawer } from '../components/asset-manager/AssetDetailDrawer';
import { SkeletonCard, EmptyState } from '../components/ui/EmptyState';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { apiErrorMessage } from '../lib/api';
import type { Asset, Employee } from '../types';

export default function AssetManager() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const { data, isLoading } = useEmployees({ search: search || undefined, departmentId: department ? Number(department) : undefined });
  const employees = data?.items ?? [];

  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);
  const [pendingTransfer, setPendingTransfer] = useState<{ asset: Asset; from: Employee | null; to: Employee | null; pickMode: boolean } | null>(null);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);

  const transferMutation = useTransferAsset();
  const pushToast = useToastStore((s) => s.push);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  function handleDragStart(event: DragStartEvent) {
    const asset = event.active.data.current?.asset as Asset | undefined;
    if (asset) setActiveAsset(asset);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveAsset(null);
    const { active, over } = event;
    if (!over) return;

    const asset = active.data.current?.asset as Asset | undefined;
    const targetEmployee = over.data.current?.employee as Employee | undefined;
    if (!asset || !targetEmployee) return;

    const fromEmployeeId = asset.assignments?.[0]?.employeeId;
    if (fromEmployeeId === targetEmployee.id) return; // dropping on the same employee: no-op

    if (asset.status !== 'ASSIGNED') {
      pushToast(`${asset.status.charAt(0) + asset.status.slice(1).toLowerCase()} assets cannot be transferred.`, 'error');
      return;
    }

    const fromEmployee = fromEmployeeId ? employeeById.get(fromEmployeeId) ?? null : null;
    setPendingTransfer({ asset, from: fromEmployee, to: targetEmployee, pickMode: false });
  }

  function confirmTransfer(reason: string, notes: string) {
    if (!pendingTransfer?.to) return;
    const { asset, to } = pendingTransfer;
    transferMutation.mutate(
      { assetId: asset.id, toEmployeeId: to.id, reason, notes },
      {
        onSuccess: () => {
          pushToast(`${asset.name} transferred to ${to.name}.`, 'success');
          setPendingTransfer(null);
        },
        onError: (err) => {
          pushToast(apiErrorMessage(err, 'Transfer failed. The asset remains with its previous owner.'), 'error');
        },
      },
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Asset Manager</h1>
          <p className="text-sm text-slate-500">Drag an asset onto another employee to transfer it.</p>
        </div>
        <Button className="w-fit"><Plus className="h-4 w-4" /> Add Asset</Button>
      </div>

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees or assets..." className="pl-9" />
        </div>
        <Select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full sm:w-48">
          <option value="">All departments</option>
        </Select>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : employees.length === 0 ? (
          <EmptyState icon={Laptop} title="No employees found" description="Try a different search or add a new employee to get started." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {employees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                activeAssetId={activeAsset?.id ?? null}
                onOpenDetail={setDetailAsset}
                onTransferClick={(asset) => setDetailAsset(asset)}
              />
            ))}
          </div>
        )}

        <DragOverlay>
          {activeAsset && (
            <div className="w-56 rotate-2 shadow-xl">
              <AssetChip asset={activeAsset} onOpenDetail={() => {}} transferrable />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <TransferModal
        open={!!pendingTransfer}
        onClose={() => setPendingTransfer(null)}
        asset={pendingTransfer?.asset ?? null}
        fromEmployee={pendingTransfer?.from ?? null}
        toEmployee={pendingTransfer?.to ?? null}
        employeeOptions={pendingTransfer?.pickMode ? employees : undefined}
        onSelectEmployee={(id) =>
          setPendingTransfer((cur) => (cur ? { ...cur, to: employeeById.get(id) ?? null } : cur))
        }
        onConfirm={confirmTransfer}
        loading={transferMutation.isPending}
      />

      <AssetDetailDrawer
        asset={detailAsset}
        onClose={() => setDetailAsset(null)}
        onTransfer={(asset) => {
          setDetailAsset(null);
          // Non-drag fallback entry point (accessibility requirement, section 40): the same
          // confirmation flow, but the user explicitly picks the destination employee.
          const from = asset.assignments?.[0]?.employeeId ? employeeById.get(asset.assignments[0].employeeId) ?? null : null;
          setPendingTransfer({ asset, from, to: null, pickMode: true });
        }}
      />
    </div>
  );
}

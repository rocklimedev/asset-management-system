import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, Monitor, Plus } from 'lucide-react';
import { useGetOrganisationsQuery, type Organisation } from '../services/api/employees.api';
import { useGetSystemsQuery, useDeleteSystemMutation, type Asset } from '../services/api/asset.api';
import { SystemDetailDrawer } from '../components/systems/SystemDetailDrawer';
import { CreateUpdateSystemModal } from '../components/systems/CreateUpdateSystemModal';
import { AssignSystemModal } from '../components/systems/AssignSystemModal';
import { AssetHistoryModal } from '../components/asset-manager/AssetHistoryModal';
import { CreateAssetModal } from '../components/asset-manager/CreateAssetModal';
import { QuickAddAsset } from '../components/quick/QuickAddAsset';
import { QuickBuildComputer } from '../components/quick/QuickBuildComputer';
import { AssetPool } from '../components/asset-manager/AssetPool';
import { SkeletonCard, EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useConfirm } from '../components/ui/confirm-dialog';
import { toast } from '../components/ui/toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { apiErrorMessage, type SystemWithOrganisation } from '../types/systems';

export default function AssetManager() {
  const [search, setSearch] = useState('');
  const [organisationId, setOrganisationId] = useState('');
  // Keep existing computer deep links working after the Work Station rename.
  const [params, setParams] = useSearchParams();
  const selectedSystemId = params.get('system');
  const confirm = useConfirm();
  const [deleteSystem, deleteSystemState] = useDeleteSystemMutation();
  const [editorOpen, setEditorOpen] = useState(false);
  const [quickAssetOpen, setQuickAssetOpen] = useState(false);
  const [quickComputerOpen, setQuickComputerOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<SystemWithOrganisation | null>(null);
  const [assignSystemOpen, setAssignSystemOpen] = useState(false);
  const [computerPoolOpen, setComputerPoolOpen] = useState(false);
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);
  const [assetModal, setAssetModal] = useState<{ open: boolean; asset: Asset | null }>({
    open: false,
    asset: null,
  });
  const { data: organisationsData, isLoading: isOrganisationsLoading } = useGetOrganisationsQuery();
  const organisations: Organisation[] = Array.isArray(organisationsData)
    ? organisationsData
    : (organisationsData?.items ?? []);
  const systemOrganisations = organisations.map((o) => ({ id: o.id, name: o.name }));
  const {
    data: systemsData = [],
    isLoading: isSystemsLoading,
    isError: isSystemsError,
    refetch: refetchSystems,
  } = useGetSystemsQuery();
  const systems = systemsData as SystemWithOrganisation[];
  const selectedSystem = systems.find((system) => String(system.id) === selectedSystemId) ?? null;
  function openCreateAsset() {
    setAssetModal({ open: true, asset: null });
  }
  function closeAssetModal() {
    setAssetModal({ open: false, asset: null });
  }
  const visibleSystems = systems
    .filter((system) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        `${system.name} ${system.systemTag} ${system.category?.name ?? ''} ${system.employee?.name ?? ''} ${
          system.organisation?.name ?? ''
        }`
          .toLowerCase()
          .includes(query);

      const matchesOrganisation =
        !organisationId || String(system.organisationId) === organisationId;

      return matchesSearch && matchesOrganisation;
    })
    // Unassigned computers first: those are the ones still waiting for someone.
    .sort((a, b) => Number(Boolean(a.employeeId)) - Number(Boolean(b.employeeId)));

  function openComputer(systemId: string) {
    setParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.set('view', 'computers');
      updated.set('system', systemId);
      return updated;
    });
  }

  function closeComputer() {
    setParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.delete('system');
      return updated;
    });
  }

  function openCreateComputer() {
    setEditingSystem(null);
    setEditorOpen(true);
  }

  function openEditComputer(system: SystemWithOrganisation) {
    setEditingSystem(system);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingSystem(null);
  }

  async function deleteComputer(system: SystemWithOrganisation) {
    const confirmed = await confirm({
      title: `Delete ${system.name}?`,
      description: `${system.name} (${system.systemTag}) will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete work station',
      tone: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteSystem(system.id).unwrap();

      setAssignSystemOpen(false);
      setComputerPoolOpen(false);
      setHistoryAsset(null);
      closeComputer();

      toast.add({
        title: 'Work station deleted',
        description: `${system.name} has been deleted.`,
        type: 'success',
      });
    } catch (error) {
      toast.add({
        title: 'Could not delete work station',
        description: apiErrorMessage(error),
        type: 'error',
      });
    }
  }

  const computerListBody = isSystemsLoading ? (
    Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
  ) : isSystemsError ? (
    <div role="alert" className="p-3 text-sm">
      Could not load work stations.{' '}
      <Button variant="outline" size="sm" onClick={() => refetchSystems()}>
        Retry
      </Button>
    </div>
  ) : visibleSystems.length === 0 ? (
    <EmptyState
      icon={Monitor}
      title="No work stations yet"
      description="Create a desktop PC or mobile phone record, add its assets, then assign it to someone."
    />
  ) : (
    visibleSystems.map((system) => (
      <ComputerRow
        key={system.id}
        system={system}
        selected={String(selectedSystem?.id) === String(system.id)}
        onSelect={() => openComputer(String(system.id))}
      />
    ))
  );

  const computerDetailBody = selectedSystem ? (
    <SystemDetailDrawer
      key={selectedSystem.id}
      system={selectedSystem}
      busy={deleteSystemState.isLoading}
      onClose={closeComputer}
      onEdit={openEditComputer}
      onDelete={deleteComputer}
      onOpenAssign={() => setAssignSystemOpen(true)}
      onOpenAssetPool={() => setComputerPoolOpen(true)}
      onShowHistory={setHistoryAsset}
    />
  ) : (
    <div className="p-6">
      <EmptyState
        icon={Monitor}
        title="Select a work station"
        description="Choose a work station to manage specifications, components, employee assets and software."
      />
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <PageHeader
        className="mb-6"
        title="Asset Manager"
        description="Manage work stations, their components, software and employee assets."
        actions={
          <>
            <Button variant="outline" onClick={() => setQuickComputerOpen(true)}>
              <Monitor className="h-4 w-4" />
              New work station
            </Button>

            <Button onClick={() => setQuickAssetOpen(true)}>
              <Plus className="h-4 w-4" />
              New asset
            </Button>
          </>
        }
      />

      {/* ======================================================
          HOW IT WORKS
          Three plain steps, always visible, so nobody has to be
          trained before they can use the page.
      ====================================================== */}

      <ol
        aria-label="How this page works"
        className="mb-6 grid gap-3 rounded-xl border border-border bg-card p-4 shadow-card sm:grid-cols-3"
      >
        {[
          ['1', 'Pick a work station', 'Choose a work station from the list.'],
          ['2', 'Add equipment', 'Pick a laptop, phone or licence that is in stock, then confirm.'],
          ['3', 'Take it back when done', 'Use Remove in an item�s menu to return it to stock.'],
        ].map(([step, title, body]) => (
          <li key={step} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {step}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <section
          aria-label="Work stations"
          className="flex flex-col overflow-hidden rounded-xl border border-border bg-card lg:max-h-[calc(100vh-190px)]"
        >
          <div className="space-y-3 border-b border-border p-3">
            <h2 className="text-sm font-semibold">
              Work Station <span className="text-muted-foreground">({visibleSystems.length})</span>
            </h2>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a work station or employee"
              aria-label="Find a work station or employee"
            />
            <select
              value={organisationId}
              onChange={(event) => setOrganisationId(event.target.value)}
              disabled={isOrganisationsLoading}
              aria-label="Filter by organisation"
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">All organisations</option>
              {organisations.map((organisation) => (
                <option key={organisation.id} value={organisation.id}>
                  {organisation.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">{computerListBody}</div>
        </section>
        <section
          aria-label="Work station details"
          className="min-w-0 rounded-xl border border-border bg-card"
        >
          {computerDetailBody}
        </section>
      </div>

      {/* ======================================================
          MODALS AND DRAWERS (unchanged behaviour)
      ====================================================== */}

      <CreateUpdateSystemModal
        open={editorOpen}
        system={editingSystem}
        organisations={systemOrganisations}
        onClose={closeEditor}
        onSaved={(systemId) => {
          closeEditor();
          openComputer(String(systemId));
        }}
      />

      <AssignSystemModal
        open={assignSystemOpen}
        system={selectedSystem}
        onClose={() => setAssignSystemOpen(false)}
        onAssigned={() => setAssignSystemOpen(false)}
      />

      <AssetPool
        open={computerPoolOpen && Boolean(selectedSystem)}
        system={selectedSystem}
        onClose={() => setComputerPoolOpen(false)}
      />

      <AssetHistoryModal
        open={Boolean(historyAsset)}
        asset={historyAsset}
        onClose={() => setHistoryAsset(null)}
      />

      <QuickAddAsset
        open={quickAssetOpen}
        onClose={() => setQuickAssetOpen(false)}
        onOpenFullForm={() => {
          setQuickAssetOpen(false);
          openCreateAsset();
        }}
      />

      <QuickBuildComputer
        open={quickComputerOpen}
        onClose={() => setQuickComputerOpen(false)}
        onOpenFullForm={() => {
          setQuickComputerOpen(false);
          openCreateComputer();
        }}
      />

      <CreateAssetModal
        open={assetModal.open}
        onClose={closeAssetModal}
        asset={assetModal.asset}
        locations={[]}
        vendors={[]}
      />
    </div>
  );
}

function ComputerRow({
  system,
  selected,
  onSelect,
}: {
  system: SystemWithOrganisation;
  selected: boolean;
  onSelect: () => void;
}) {
  const holder = system.employee?.name ?? null;
  const parts = system.assignments?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={
        'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ' +
        (selected ? 'border-primary-border bg-primary-muted' : 'border-transparent hover:bg-muted')
      }
    >
      <span
        className={
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ' +
          (selected
            ? 'border-primary-border bg-background text-primary'
            : 'border-border bg-muted text-muted-foreground')
        }
      >
        <Monitor className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{system.name}</span>

        <span className="block truncate text-xs text-muted-foreground">
          {holder ? (
            <>With {holder}</>
          ) : (
            <span className="font-medium text-warning-strong">Unassigned</span>
          )}
          {` · ${system.category?.name ?? 'Category not set'} · ${parts} part${parts === 1 ? '' : 's'}`}
          {system.organisation?.name && (
            <>
              {' · '}
              <Building2 className="mr-0.5 inline h-3 w-3 align-[-2px]" />
              {system.organisation.name}
            </>
          )}
        </span>
      </span>
    </button>
  );
}

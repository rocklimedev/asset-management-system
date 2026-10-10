import * as Tabs from "@radix-ui/react-tabs";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Monitor, Plus, Search, Building2 } from "lucide-react";

import {
  useGetSystemsQuery,
  useDeleteSystemMutation,
} from "../services/api/asset.api";
import type { Asset } from "../types";
import { useGetOrganisationsQuery } from "../services/api/employees.api";

import { AssetPool } from "../components/asset-manager/AssetPool";
import { AssetHistoryModal } from "../components/asset-manager/AssetHistoryModal";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "../components/ui/toast";

import { SystemDetailDrawer } from "../components/systems/SystemDetailDrawer";
import { CreateUpdateSystemModal } from "../components/systems/CreateUpdateSystemModal";
import { AssignSystemModal } from "../components/systems/AssignSystemModal";
import {
  apiErrorMessage,
  type OrganisationInfo,
  type SystemWithOrganisation,
} from "../types/systems";

export default function SystemsPage() {
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [organisationFilter, setOrganisationFilter] = useState("");

  const {
    data: systems = [],
    isLoading,
    isError,
    refetch,
  } = useGetSystemsQuery();

  const organisationSystems = systems as SystemWithOrganisation[];

  // Organisation data for dropdowns now comes straight from the org API,
  // instead of being derived from whatever organisations happen to show up
  // on the systems list.
  const { data: organisationsData } = useGetOrganisationsQuery();

  const organisations: OrganisationInfo[] = useMemo(() => {
    const list = Array.isArray(organisationsData)
      ? organisationsData
      : (organisationsData?.items ?? []);

    return [...list]
      .map((o) => ({ id: o.id, name: o.name }))
      .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
  }, [organisationsData]);

  const selected = organisationSystems.find(
    (s) => s.id === params.get("system"),
  );

  const activeTab = selected
    ? (selected.employeeId ? "grid" : "inventory")
    : (params.get("tab") === "inventory" ? "inventory" : "grid");
  const assignedCount = systems.filter((system) => !!system.employeeId).length;
  function closeSelection() {
    setParams({ tab: activeTab });
  }

  const filtered = organisationSystems.filter((system) => {
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      `${system.name} ${system.systemTag} ${
        system.employee?.name ?? ""
      } ${system.organisation?.name ?? ""}`
        .toLowerCase()
        .includes(query);

    const matchesOrganisation =
      !organisationFilter ||
      (organisationFilter === "__none__"
        ? !system.organisationId
        : system.organisationId === organisationFilter);

    return matchesSearch && matchesOrganisation &&
      (activeTab === "grid" ? !!system.employeeId : !system.employeeId);
  });

  // Editor (create/update) modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSystem, setEditingSystem] =
    useState<SystemWithOrganisation | null>(null);

  // Assign / transfer modal
  const [assignOpen, setAssignOpen] = useState(false);

  // Asset pool + history
  const [pool, setPool] = useState(false);
  const [history, setHistory] = useState<Asset | null>(null);

  const [deleteSystem, deleteSystemState] = useDeleteSystemMutation();

  const busy = deleteSystemState.isLoading;

  function openCreate() {
    setEditingSystem(null);
    setEditorOpen(true);
  }

  function openEdit(system: SystemWithOrganisation) {
    setEditingSystem(system);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingSystem(null);
  }

  function handleSaved(systemId: string) {
    closeEditor();
    setParams({ tab: editingSystem?.employeeId ? "grid" : "inventory", system: systemId });
  }

  async function deleteSelectedSystem(system: SystemWithOrganisation) {
    const confirmed = window.confirm(
      `Delete "${system.name}" (${system.systemTag})?\n\nThis action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await deleteSystem(system.id).unwrap();

      setAssignOpen(false);
      setPool(false);
      setHistory(null);
      closeSelection();

      toast.add({
        title: "System deleted",
        description: `${system.name} has been deleted.`,
        type: "success",
      });
    } catch (error) {
      toast.add({
        title: "Could not delete system",
        description: apiErrorMessage(error),
        type: "error",
      });
    }
  }

  function clearFilters() {
    setSearch("");
    setOrganisationFilter("");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* ============================================================
          PAGE HEADER
      ============================================================ */}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Systems</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build a PC from assets, optionally scope it to an organisation, then
            assign the whole system to an employee.
          </p>
        </div>

        <Button onClick={openCreate} disabled={busy}>
          <Plus className="mr-2 h-4 w-4" />
          New system
        </Button>
      </div>

      {/* ============================================================
          SUMMARY
      ============================================================ */}

      <div className="grid gap-4 sm:grid-cols-5">
        {[
          ["Systems", systems.length],
          ["Assigned to employees", assignedCount],
          ["Unassigned inventory", systems.length - assignedCount],
          [
            "Organisation scoped",
            organisationSystems.filter((s) => !!s.organisationId).length,
          ],
          [
            "Components",
            systems.reduce((n, s) => n + (s.assignments?.length ?? 0), 0),
          ],
        ].map(([label, count]) => (
          <div key={String(label)} className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{count}</p>
          </div>
        ))}
      </div>

      {/* ============================================================
          SYSTEM LIST + DETAIL
      ============================================================ */}

      <Tabs.Root value={activeTab} onValueChange={(tab) => setParams({ tab })}>
        <Tabs.List aria-label="System assignment" className="inline-flex gap-1 rounded-lg bg-muted p-1">
          <Tabs.Trigger value="grid" className="rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">Grid ({assignedCount})</Tabs.Trigger>
          <Tabs.Trigger value="inventory" className="rounded-md px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">Inventory ({systems.length - assignedCount})</Tabs.Trigger>
        </Tabs.List>
        <p className="mt-2 text-sm text-muted-foreground">{activeTab === "grid" ? "Systems assigned to employees." : "Unassigned systems available for employee assignment."}</p>
      <Tabs.Content value={activeTab} className="mt-4 outline-none">
      {isLoading ? (
        <p role="status">Loading systems…</p>
      ) : isError ? (
        <div role="alert" className="rounded-xl border p-6">
          Could not load systems.{" "}
          <Button variant="outline" onClick={refetch}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
          <section className="space-y-3 lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search systems"
                placeholder="Search systems, employees or organisations"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <select
              aria-label="Filter by organisation"
              value={organisationFilter}
              onChange={(e) => setOrganisationFilter(e.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All organisations</option>
              <option value="__none__">No organisation</option>

              {organisations.map((organisation) => (
                <option key={organisation.id} value={organisation.id}>
                  {organisation.name || organisation.id}
                </option>
              ))}
            </select>

            {(search || organisationFilter) && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}

            {filtered.map((system) => (
              <button
                key={system.id}
                onClick={() => setParams({ tab: activeTab, system: system.id })}
                disabled={busy}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${
                  selected?.id === system.id
                    ? "border-primary bg-primary/5"
                    : "bg-card hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{system.name}</span>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {system.systemTag} · {system.assignments?.length ?? 0}{" "}
                  components
                </p>

                <div className="mt-3 space-y-1">
                  <p className="text-sm">
                    {system.employee?.name ?? "Unassigned system"}
                  </p>

                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {system.organisation?.name ?? "No organisation"}
                  </p>
                </div>
              </button>
            ))}

            {!filtered.length && (
              <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                {search || organisationFilter
                  ? "No matching systems."
                  : activeTab === "inventory" ? "No unassigned systems. Create a system to add it to inventory." : "No assigned systems. Assign a system from Inventory to an employee."}
              </p>
            )}
          </section>

          <SystemDetailDrawer
            system={selected}
            busy={busy}
            onClose={closeSelection}
            onEdit={openEdit}
            onDelete={deleteSelectedSystem}
            onOpenAssign={() => setAssignOpen(true)}
            onOpenAssetPool={() => setPool(true)}
            onShowHistory={setHistory}
          />
        </div>
      )}

      </Tabs.Content>
      </Tabs.Root>

      {/* ============================================================
          MODALS
      ============================================================ */}

      <CreateUpdateSystemModal
        open={editorOpen}
        system={editingSystem}
        organisations={organisations}
        onClose={closeEditor}
        onSaved={handleSaved}
      />

      <AssignSystemModal
        open={assignOpen}
        system={selected}
        onClose={() => setAssignOpen(false)}
        onAssigned={() => setAssignOpen(false)}
      />

      <AssetPool
        open={pool && !!selected}
        system={selected}
        onClose={() => setPool(false)}
      />

      <AssetHistoryModal
        open={!!history}
        asset={history}
        onClose={() => setHistory(null)}
      />
    </div>
  );
}

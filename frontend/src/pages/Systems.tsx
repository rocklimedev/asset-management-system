import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Monitor, Plus, Search, Pencil, Package, Undo2 } from "lucide-react";
import {
  useGetSystemsQuery,
  useCreateSystemMutation,
  useUpdateSystemMutation,
  useAssignSystemMutation,
  useReturnAssetMutation,
  type Asset,
  type SystemRecord,
} from "../services/api/asset.api";
import { useGetEmployeesQuery } from "../services/api/employees.api";
import { AssetPool } from "../components/asset-manager/AssetPool";
import { AssetHistoryModal } from "../components/asset-manager/AssetHistoryModal";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { toast } from "../components/ui/toast";

function message(error: unknown) {
  const value = (error as { data?: { message?: string | string[] } })?.data
    ?.message;
  return Array.isArray(value)
    ? value.join(". ")
    : (value ?? "Please try again.");
}

export default function Systems() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const {
    data: systems = [],
    isLoading,
    isError,
    refetch,
  } = useGetSystemsQuery();
  const selected = systems.find((s) => s.id === params.get("system"));
  const filtered = systems.filter((s) =>
    `${s.name} ${s.systemTag} ${s.employee?.name ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const [editor, setEditor] = useState<{
    id?: string;
    name: string;
    systemTag: string;
    notes: string;
  } | null>(null);
  const [pool, setPool] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePage, setEmployeePage] = useState(1);
  const [employeeId, setEmployeeId] = useState("");
  const [history, setHistory] = useState<Asset | null>(null);
  const {
    data: employeeData,
    isFetching: loadingEmployees,
    isError: employeesError,
  } = useGetEmployeesQuery(
    { search: employeeSearch || undefined, page: employeePage },
    { skip: !assigning },
  );
  const employeeResult = Array.isArray(employeeData)
    ? { items: employeeData, total: employeeData.length, pageSize: 24 }
    : employeeData;
  const employees = (employeeResult?.items ?? []).filter(
    (e) => e.status === "ACTIVE" || e.status === "ON_LEAVE",
  );
  const [create, createState] = useCreateSystemMutation();
  const [update, updateState] = useUpdateSystemMutation();
  const [assign, assignState] = useAssignSystemMutation();
  const [remove, removeState] = useReturnAssetMutation();
  const busy =
    createState.isLoading ||
    updateState.isLoading ||
    assignState.isLoading ||
    removeState.isLoading;
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editor) return;
    try {
      const body = {
        ...editor,
        name: editor.name.trim(),
        systemTag: editor.systemTag.trim(),
      };
      const result = editor.id
        ? await update({ ...body, id: editor.id }).unwrap()
        : await create(body).unwrap();
      setEditor(null);
      setParams({ system: result.id });
      toast.add({ title: "System saved", type: "success" });
    } catch (error) {
      toast.add({
        title: "Could not save system",
        description: message(error),
        type: "error",
      });
    }
  }
  async function setOwner(system: SystemRecord, owner: string | null) {
    try {
      await assign({ id: system.id, employeeId: owner }).unwrap();
      setAssigning(false);
      setEmployeeId("");
      toast.add({
        title: owner ? "System assigned" : "System returned",
        description: "Its components remain together.",
        type: "success",
      });
    } catch (error) {
      toast.add({
        title: "Assignment failed",
        description: message(error),
        type: "error",
      });
    }
  }
  async function removeComponent(id: string) {
    try {
      await remove({ id, notes: "Removed from system" }).unwrap();
      toast.add({ title: "Component removed", type: "success" });
    } catch (error) {
      toast.add({
        title: "Could not remove component",
        description: message(error),
        type: "error",
      });
    }
  }
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Systems</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build a PC from assets, then assign the whole system to an employee.
          </p>
        </div>
        <Button
          onClick={() => setEditor({ name: "", systemTag: "", notes: "" })}
        >
          <Plus className="mr-2 h-4 w-4" />
          New system
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Systems", systems.length],
          ["Assigned to employees", systems.filter((s) => s.employeeId).length],
          [
            "Components",
            systems.reduce((n, s) => n + (s.assignments?.length ?? 0), 0),
          ],
        ].map(([label, count]) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{count}</p>
          </div>
        ))}
      </div>
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
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <section className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search systems"
                placeholder="Search systems or employees"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {filtered.map((system) => (
              <button
                key={system.id}
                onClick={() => setParams({ system: system.id })}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${selected?.id === system.id ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/40"}`}
              >
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{system.name}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {system.systemTag} · {system.assignments?.length ?? 0}{" "}
                  components
                </p>
                <p className="mt-3 text-sm">
                  {system.employee?.name ?? "Unassigned system"}
                </p>
              </button>
            ))}
            {!filtered.length && (
              <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                {search
                  ? "No matching systems."
                  : "Create your first system to group PC components."}
              </p>
            )}
          </section>
          {selected ? (
            <section className="rounded-xl border bg-card">
              <div className="space-y-4 border-b p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {selected.systemTag}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">
                      {selected.name}
                    </h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setEditor({
                        id: selected.id,
                        name: selected.name,
                        systemTag: selected.systemTag,
                        notes: selected.notes ?? "",
                      })
                    }
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </div>
                {selected.notes && (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {selected.notes}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/40 p-3">
                  <div className="mr-auto">
                    <p className="text-xs text-muted-foreground">
                      Assigned employee
                    </p>
                    <p className="text-sm font-medium">
                      {selected.employee?.name ?? "Unassigned"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setEmployeeId("");
                      setEmployeeSearch("");
                      setEmployeePage(1);
                      setAssigning(true);
                    }}
                  >
                    {selected.employeeId ? "Transfer system" : "Assign system"}
                  </Button>
                  {selected.employeeId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => setOwner(selected, null)}
                    >
                      <Undo2 className="mr-2 h-4 w-4" />
                      Return
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-medium">
                    Components ({selected.assignments?.length ?? 0})
                  </h3>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => setPool(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add asset
                  </Button>
                </div>
                <div className="space-y-2">
                  {selected.assignments?.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
                    >
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <div className="mr-auto">
                        <p className="text-sm font-medium">{a.asset?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.asset?.assetTag ?? "No tag"} ·{" "}
                          {a.asset?.category?.name ?? a.asset?.kind} ·{" "}
                          {a.asset?.status}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setHistory(a.asset ?? null)}
                      >
                        History
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => removeComponent(a.assetId)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                {!selected.assignments?.length && (
                  <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                    No components yet. Add assets from the available pool.
                  </div>
                )}
                <p className="mt-4 text-xs text-muted-foreground">
                  Remove a component to make it available for another system or
                  a direct employee assignment.
                </p>
              </div>
            </section>
          ) : (
            <div className="flex min-h-80 items-center justify-center rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              <div>
                <Monitor className="mx-auto mb-3 h-10 w-10" />
                <p>Select a system to manage its components and employee.</p>
              </div>
            </div>
          )}
        </div>
      )}
      <Dialog
        open={!!editor}
        onOpenChange={(open) => {
          if (!open && !busy) setEditor(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editor?.id ? "Edit system" : "New system"}
            </DialogTitle>
            <DialogDescription>
              A system groups the assets that make up a PC.
            </DialogDescription>
          </DialogHeader>
          {editor && (
            <form onSubmit={save} className="space-y-4">
              <div>
                <Label htmlFor="system-tag">System tag</Label>
                <Input
                  id="system-tag"
                  required
                  maxLength={100}
                  placeholder="PC-001"
                  value={editor.systemTag}
                  onChange={(e) =>
                    setEditor({ ...editor, systemTag: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="system-name">Name</Label>
                <Input
                  id="system-name"
                  required
                  maxLength={255}
                  placeholder="Design workstation"
                  value={editor.name}
                  onChange={(e) =>
                    setEditor({ ...editor, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="system-notes">Notes</Label>
                <Textarea
                  id="system-notes"
                  maxLength={5000}
                  value={editor.notes}
                  onChange={(e) =>
                    setEditor({ ...editor, notes: e.target.value })
                  }
                />
              </div>
              <Button
                type="submit"
                disabled={
                  busy || !editor.name.trim() || !editor.systemTag.trim()
                }
              >
                {busy ? "Saving…" : "Save system"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={assigning && !!selected}
        onOpenChange={(open) => {
          if (!busy) setAssigning(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {selected?.name}</DialogTitle>
            <DialogDescription>
              All components stay with this system when its employee changes.
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="Search employees"
            placeholder="Search employees"
            value={employeeSearch}
            onChange={(e) => {
              setEmployeeSearch(e.target.value);
              setEmployeePage(1);
              setEmployeeId("");
            }}
          />
          <Label htmlFor="system-employee">Employee</Label>
          <select
            id="system-employee"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            disabled={loadingEmployees}
          >
            <option value="">Choose employee</option>
            {employees.map((e) => (
              <option
                key={e.id}
                value={e.id}
                disabled={e.id === selected?.employeeId}
              >
                {e.name} · {e.employeeCode}
              </option>
            ))}
          </select>
          {employeesError && (
            <p role="alert" className="text-sm text-destructive">
              Could not load employees.
            </p>
          )}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              disabled={employeePage <= 1 || loadingEmployees}
              onClick={() => {
                setEmployeePage((p) => p - 1);
                setEmployeeId("");
              }}
            >
              Previous
            </Button>
            <span className="text-xs">Page {employeePage}</span>
            <Button
              variant="outline"
              disabled={
                loadingEmployees ||
                employeePage * (employeeResult?.pageSize ?? 24) >=
                  (employeeResult?.total ?? 0)
              }
              onClick={() => {
                setEmployeePage((p) => p + 1);
                setEmployeeId("");
              }}
            >
              Next
            </Button>
          </div>
          <Button
            disabled={!employeeId || busy || loadingEmployees}
            onClick={() => selected && setOwner(selected, employeeId)}
          >
            Assign system
          </Button>
        </DialogContent>
      </Dialog>
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

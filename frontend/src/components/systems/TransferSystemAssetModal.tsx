import { useState } from "react";
import { useGetSystemsQuery, useTransferAssetMutation } from "../../services/api/asset.api";
import { useTransferSoftwareInstallationMutation } from "../../services/api/software.api";
import { useGetEmployeesQuery } from "../../services/api/employees.api";
import { apiErrorMessage } from "../../types/systems";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { toast } from "../ui/toast";

export type SystemTransferTarget = { id: string; name: string; kind: "component" | "asset" | "software" };

export function TransferSystemAssetModal({ target, systemId, employeeId: currentEmployeeId, onClose }: {
  target: SystemTransferTarget;
  systemId: string;
  employeeId: string | null;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [employeeId, setEmployeeId] = useState(currentEmployeeId ?? "");
  const [toSystemId, setToSystemId] = useState("");
  const [notes, setNotes] = useState("");
  const [transferAsset, assetState] = useTransferAssetMutation();
  const [transferSoftware, softwareState] = useTransferSoftwareInstallationMutation();
  const busy = assetState.isLoading || softwareState.isLoading;
  const { data, isFetching, isError } = useGetEmployeesQuery({ search: search || undefined, page });
  const result = Array.isArray(data) ? { items: data, total: data.length, pageSize: 24 } : data;
  const employees = (result?.items ?? []).filter(e => e.status === "ACTIVE" || e.status === "ON_LEAVE");
  const { data: systems = [], isFetching: loadingSystems, isError: systemsError } = useGetSystemsQuery(
    { employeeId }, { skip: !employeeId },
  );
  const destinations = systems.filter(s => (target.kind === "asset" || s.id !== systemId) && s.employeeId === employeeId);
  const requiresSystem = target.kind === "software";
  const detachToEmployee = target.kind === "component" && employeeId === currentEmployeeId && !toSystemId;
  const unchangedDirectOwner = target.kind === "asset" && employeeId === currentEmployeeId && !toSystemId;
  const validDestination = !unchangedDirectOwner && !loadingSystems && !systemsError && (toSystemId ? destinations.some(s => s.id === toSystemId) : !requiresSystem);

  async function confirm() {
    if (!employeeId || busy || !validDestination) return;
    try {
      if (target.kind === "software") {
        await transferSoftware({ id: target.id, toSystemId, notes: notes || undefined }).unwrap();
      } else {
        await transferAsset({ id: target.id, fromSystemId: target.kind === "component" ? systemId : undefined, toSystemId: toSystemId || undefined, toEmployeeId: employeeId, reason: toSystemId ? "System reassignment" : detachToEmployee ? "Detached from system to same employee" : "Employee transfer", notes: notes || undefined }).unwrap();
      }
      toast.add({ title: detachToEmployee ? "Asset assigned directly to employee" : "Asset transferred", type: "success" });
      onClose();
    } catch (error) {
      toast.add({ title: "Could not transfer asset", description: apiErrorMessage(error), type: "error" });
    }
  }

  function changePage(next: number) { setPage(next); setEmployeeId(""); setToSystemId(""); }

  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer asset</DialogTitle>
          <DialogDescription>
            Transfer {target.name} to an employee or another system.
            {target.kind === "software" ? " Choose the employee’s destination system for this installation." : " Choose Assign directly to employee to detach it from this system and keep it with the same employee, or select a different destination."}
          </DialogDescription>
        </DialogHeader>
        <Input aria-label="Search employees" placeholder="Search employees" value={search} disabled={busy} onChange={e => { setSearch(e.target.value); changePage(1); }} />
        <Label htmlFor="transfer-system-employee">Employee</Label>
        <select id="transfer-system-employee" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={employeeId} disabled={busy || isFetching} onChange={e => { setEmployeeId(e.target.value); setToSystemId(""); }}>
          <option value="">Choose employee</option>
          {currentEmployeeId && !employees.some(e => e.id === currentEmployeeId) && <option value={currentEmployeeId}>Current employee</option>}
          {employees.map(e => <option key={e.id} value={e.id}>{e.name} · {e.employeeCode}</option>)}
        </select>
        {isError && <p role="alert" className="text-sm text-destructive">Could not load employees.</p>}
        <div className="flex items-center justify-between">
          <Button variant="outline" disabled={busy || isFetching || page <= 1} onClick={() => changePage(page - 1)}>Previous</Button>
          <span className="text-xs">Page {page}</span>
          <Button variant="outline" disabled={busy || isFetching || page * (result?.pageSize ?? 24) >= (result?.total ?? 0)} onClick={() => changePage(page + 1)}>Next</Button>
        </div>
        {employeeId && <>
          <Label htmlFor="transfer-destination-system">Destination system</Label>
          <select id="transfer-destination-system" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={toSystemId} disabled={busy || loadingSystems} onChange={e => setToSystemId(e.target.value)}>
            <option value="">{requiresSystem ? "Choose system" : "Assign directly to employee"}</option>
            {destinations.map(s => <option key={s.id} value={s.id}>{s.name} · {s.systemTag}</option>)}
          </select>
          {systemsError ? <p role="alert" className="text-sm text-destructive">Could not load employee systems.</p> : requiresSystem && !loadingSystems && !destinations.length && <p className="text-sm text-muted-foreground">This employee needs another assigned system to receive this asset.</p>}
        </>}
        <Label htmlFor="system-transfer-notes">Notes (optional)</Label>
        <Textarea id="system-transfer-notes" value={notes} disabled={busy} onChange={e => setNotes(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button loading={busy} disabled={busy || isFetching || isError || !employeeId || !validDestination} onClick={confirm}>{detachToEmployee ? "Detach and assign to employee" : "Confirm transfer"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

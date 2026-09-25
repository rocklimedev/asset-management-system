import { useState } from "react";

import { useAssignSystemMutation } from "../../services/api/asset.api";
import { useGetEmployeesQuery } from "../../services/api/employees.api";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { toast } from "../../components/ui/toast";

import {
  apiErrorMessage,
  type SystemWithOrganisation,
} from "../../types/systems";

type Props = {
  open: boolean;
  system: SystemWithOrganisation | null | undefined;
  onClose: () => void;
  onAssigned: () => void;
};

export function AssignSystemModal({
  open,
  system,
  onClose,
  onAssigned,
}: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [employeeId, setEmployeeId] = useState("");

  const [assign, assignState] = useAssignSystemMutation();

  const {
    data: employeeData,
    isFetching: loadingEmployees,
    isError: employeesError,
  } = useGetEmployeesQuery(
    { search: search || undefined, page },
    { skip: !open },
  );

  const employeeResult = Array.isArray(employeeData)
    ? { items: employeeData, total: employeeData.length, pageSize: 24 }
    : employeeData;

  const employees = (employeeResult?.items ?? []).filter(
    (e) => e.status === "ACTIVE" || e.status === "ON_LEAVE",
  );

  function close() {
    if (assignState.isLoading) return;
    setSearch("");
    setPage(1);
    setEmployeeId("");
    onClose();
  }

  async function confirmAssign() {
    if (!system || !employeeId) return;

    try {
      await assign({ id: system.id, employeeId }).unwrap();

      toast.add({
        title: "System assigned",
        description: "Its components remain together.",
        type: "success",
      });

      setEmployeeId("");
      onAssigned();
    } catch (error) {
      toast.add({
        title: "Assignment failed",
        description: apiErrorMessage(error),
        type: "error",
      });
    }
  }

  return (
    <Dialog open={open && !!system} onOpenChange={(next) => !next && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign {system?.name}</DialogTitle>

          <DialogDescription>
            All components stay with this system when its employee changes.
            {system?.organisation?.name
              ? ` This system is scoped to ${system.organisation.name}.`
              : " This system has no organisation restriction."}
          </DialogDescription>
        </DialogHeader>

        <Input
          aria-label="Search employees"
          placeholder="Search employees"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
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
              disabled={e.id === system?.employeeId}
            >
              {e.name} · {e.employeeCode}
            </option>
          ))}
        </select>

        {system?.organisationId && (
          <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              Organisation restriction:
            </span>{" "}
            The backend will only allow an employee belonging to{" "}
            {system.organisation?.name ?? "this organisation"} to receive this
            system.
          </p>
        )}

        {employeesError && (
          <p role="alert" className="text-sm text-destructive">
            Could not load employees.
          </p>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            disabled={page <= 1 || loadingEmployees}
            onClick={() => {
              setPage((p) => p - 1);
              setEmployeeId("");
            }}
          >
            Previous
          </Button>

          <span className="text-xs">Page {page}</span>

          <Button
            variant="outline"
            disabled={
              loadingEmployees ||
              page * (employeeResult?.pageSize ?? 24) >=
                (employeeResult?.total ?? 0)
            }
            onClick={() => {
              setPage((p) => p + 1);
              setEmployeeId("");
            }}
          >
            Next
          </Button>
        </div>

        <Button
          disabled={!employeeId || assignState.isLoading || loadingEmployees}
          onClick={confirmAssign}
        >
          Assign system
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default AssignSystemModal;

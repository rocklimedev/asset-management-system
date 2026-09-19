import { useState } from "react";
import { ArrowRight } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import type { Asset } from "../../services/api/asset.api";
import type { Employee } from "../../services/api/employees.api";

const REASONS = [
  "Employee transfer",
  "Team reassignment",
  "Manager request",
  "Equipment upgrade",
  "Other",
];

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  asset: Asset | null;
  fromEmployee: Employee | null;
  toEmployee: Employee | null;
  employeeOptions?: Employee[];
  onSelectEmployee?: (employeeId: number) => void;
  onConfirm: (reason: string, notes: string) => void;
  loading: boolean;
}

export function TransferModal({
  open,
  onClose,
  asset,
  fromEmployee,
  toEmployee,
  employeeOptions,
  onSelectEmployee,
  onConfirm,
  loading,
}: TransferModalProps) {
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState("");

  if (!asset) return null;

  const availableEmployees =
    employeeOptions?.filter((employee) => employee.id !== fromEmployee?.id) ??
    [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !loading) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Transfer asset</DialogTitle>

          <DialogDescription>
            {toEmployee
              ? `You are about to transfer this asset to ${toEmployee.name}.`
              : "Choose who this asset should be transferred to."}
          </DialogDescription>
        </DialogHeader>

        {/* ==================================================
            ASSET
        ================================================== */}

        <div className="rounded-lg border border-border bg-muted p-3">
          <p className="text-sm font-medium text-foreground">{asset.name}</p>

          <p className="text-xs tabular-nums text-muted-foreground">
            Asset ID: {asset.assetTag}
          </p>
        </div>

        {/* ==================================================
            TRANSFER DIRECTION
        ================================================== */}

        <div className="flex items-center gap-3 text-sm">
          <div className="min-w-0 flex-1 rounded-lg border border-border bg-card p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              From
            </p>

            <p className="mt-0.5 truncate font-medium text-foreground">
              {fromEmployee?.name ?? "Unassigned"}
            </p>
          </div>

          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />

          <div className="min-w-0 flex-1 rounded-lg border border-primary-border bg-primary-muted p-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              To
            </p>

            {employeeOptions ? (
              <Select
                value={toEmployee?.id ? String(toEmployee.id) : undefined}
                onValueChange={(value) => {
                  const employeeId = Number(value);

                  if (employeeId) {
                    onSelectEmployee?.(employeeId);
                  }
                }}
                disabled={loading}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full border-0 bg-transparent px-0 font-medium text-primary-strong hover:bg-transparent"
                >
                  <SelectValue placeholder="Select an employee..." />
                </SelectTrigger>

                <SelectContent>
                  {availableEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={String(employee.id)}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="mt-0.5 truncate font-medium text-primary-strong">
                {toEmployee?.name ?? "No employee selected"}
              </p>
            )}
          </div>
        </div>

        {/* ==================================================
            REASON
        ================================================== */}

        <div className="space-y-1.5">
          <Label htmlFor="transfer-reason">Reason</Label>

          <Select value={reason} onValueChange={setReason} disabled={loading}>
            <SelectTrigger id="transfer-reason" className="w-full">
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>

            <SelectContent>
              {REASONS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ==================================================
            NOTES
        ================================================== */}

        <div className="space-y-1.5">
          <Label htmlFor="transfer-notes">Notes (optional)</Label>

          <Textarea
            id="transfer-notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add any context for this transfer..."
            disabled={loading}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <Button
            onClick={() => onConfirm(reason, notes)}
            loading={loading}
            disabled={!toEmployee}
          >
            Confirm transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

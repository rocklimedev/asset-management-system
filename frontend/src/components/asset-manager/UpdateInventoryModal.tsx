import { useEffect, useState } from "react";
import { PackagePlus } from "lucide-react";

import {
  useAdjustInventoryMutation,
  type Asset,
  type AdjustInventoryRequest,
} from "../../services/api/asset.api";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { toast } from "../ui/toast";

// ============================================================
// TYPES
// ============================================================

type ChangeType = AdjustInventoryRequest["changeType"];

interface UpdateInventoryModalProps {
  open: boolean;
  asset: Asset | null;
  onClose: () => void;
}

// ============================================================
// CONSTANTS
// ============================================================

const CHANGE_TYPES: { value: ChangeType; label: string }[] = [
  { value: "RESTOCK", label: "Restock (add stock)" },
  { value: "RETURNED", label: "Returned (add stock)" },
  { value: "CONSUMED", label: "Consumed (remove stock)" },
  { value: "WRITE_OFF", label: "Write-off (remove stock)" },
  { value: "ADJUSTMENT", label: "Manual adjustment" },
];

// A change type either always adds stock, always removes it, or (for a
// manual ADJUSTMENT) lets the person pick the direction themselves.
const DEFAULT_DIRECTION: Record<ChangeType, "increase" | "decrease" | null> = {
  RESTOCK: "increase",
  RETURNED: "increase",
  CONSUMED: "decrease",
  WRITE_OFF: "decrease",
  ADJUSTMENT: null,
};

// ============================================================
// HELPERS
// ============================================================

function errorMessage(error: unknown, fallback: string): string {
  const value = (error as { data?: { message?: string | string[] } })?.data
    ?.message;

  if (Array.isArray(value)) {
    return value.join(". ");
  }

  return value ?? fallback;
}

// ============================================================
// COMPONENT
// ============================================================

export function UpdateInventoryModal({
  open,
  asset,
  onClose,
}: UpdateInventoryModalProps) {
  const [changeType, setChangeType] = useState<ChangeType>("RESTOCK");
  const [quantity, setQuantity] = useState("1");
  const [direction, setDirection] = useState<"increase" | "decrease">(
    "increase",
  );
  const [reason, setReason] = useState("");

  const [adjustInventory, { isLoading }] = useAdjustInventoryMutation();

  // ------------------------------------------------------------
  // Reset the form whenever a new asset is opened
  // ------------------------------------------------------------

  useEffect(() => {
    if (open) {
      setChangeType("RESTOCK");
      setQuantity("1");
      setDirection("increase");
      setReason("");
    }
  }, [open, asset?.id]);

  if (!asset) {
    return null;
  }

  const currentQuantity = asset.quantity ?? 1;
  const currentAssigned = asset.quantityAssigned ?? 0;
  const currentAvailable = currentQuantity - currentAssigned;

  const effectiveDirection = DEFAULT_DIRECTION[changeType] ?? direction;

  const parsedQuantity = Number(quantity);
  const isValidQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0;

  // Prevent a decrease from taking available stock negative.
  const wouldGoNegative =
    effectiveDirection === "decrease" &&
    isValidQuantity &&
    parsedQuantity > currentAvailable;

  function handleClose() {
    if (!isLoading) {
      onClose();
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!asset || !isValidQuantity || wouldGoNegative) {
      return;
    }

    try {
      await adjustInventory({
        id: asset.id,
        changeType,
        quantity: parsedQuantity,
        direction: DEFAULT_DIRECTION[changeType] ? undefined : direction,
        reason: reason.trim() || undefined,
      }).unwrap();

      toast.add({
        type: "success",
        title: "Inventory updated",
        description: `${asset.name} stock was adjusted.`,
      });

      onClose();
    } catch (error) {
      toast.add({
        type: "error",
        title: "Could not update inventory",
        description: errorMessage(
          error,
          "The inventory adjustment failed. Please try again.",
        ),
      });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          handleClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update inventory</DialogTitle>
          <DialogDescription>
            Adjust the stock on hand for {asset.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total quantity</span>
            <span className="font-medium tabular-nums">{currentQuantity}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Assigned</span>
            <span className="font-medium tabular-nums">{currentAssigned}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Available</span>
            <span className="font-medium tabular-nums">{currentAvailable}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="inventory-change-type">Change type</Label>
            <Select
              value={changeType}
              onValueChange={(value) => setChangeType(value as ChangeType)}
            >
              <SelectTrigger id="inventory-change-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANGE_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {changeType === "ADJUSTMENT" && (
            <div>
              <Label htmlFor="inventory-direction">Direction</Label>
              <Select
                value={direction}
                onValueChange={(value) =>
                  setDirection(value as "increase" | "decrease")
                }
              >
                <SelectTrigger id="inventory-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">Increase stock</SelectItem>
                  <SelectItem value="decrease">Decrease stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="inventory-quantity">Quantity</Label>
            <Input
              id="inventory-quantity"
              type="number"
              min={1}
              step={1}
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
            {wouldGoNegative && (
              <p className="mt-1 text-xs text-destructive">
                Only {currentAvailable} unit
                {currentAvailable === 1 ? "" : "s"} available to remove.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="inventory-reason">Reason (optional)</Label>
            <Textarea
              id="inventory-reason"
              maxLength={500}
              placeholder="e.g. PO #4821, damaged in shipping, annual count..."
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !isValidQuantity || wouldGoNegative}
          >
            <PackagePlus className="mr-2 h-4 w-4" />
            {isLoading ? "Saving…" : "Save adjustment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default UpdateInventoryModal;

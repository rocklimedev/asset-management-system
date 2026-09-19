import { useState } from "react";
import { Package, Search } from "lucide-react";

import {
  useGetAssetPoolQuery,
  useAssignAssetMutation,
} from "../../services/api/asset.api";

import { toast } from "../ui/toast";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { EmptyState, SkeletonCard } from "../ui/EmptyState";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { Employee } from "../../services/api/employees.api";
import type { AssetPoolItem } from "../../services/api/asset.api";

// ============================================================
// TYPES
// ============================================================

interface AssetPoolProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
}

interface TransferError {
  data?: {
    message?: string;
    error?: string;
  };
  message?: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;

  const apiError = error as TransferError;

  return (
    apiError.data?.message ||
    apiError.data?.error ||
    apiError.message ||
    fallback
  );
}

// ============================================================
// COMPONENT
// ============================================================

export function AssetPool({ open, employee, onClose }: AssetPoolProps) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"" | "HARDWARE" | "SOFTWARE">("");

  const { data, isLoading, isFetching } = useGetAssetPoolQuery(
    {
      search: search || undefined,
      kind: kind || undefined,
      organisationId: employee?.organisationId ?? undefined,
      pageSize: 20,
    },
    {
      skip: !open,
    },
  );

  const [assignAsset, { isLoading: isAssigning }] = useAssignAssetMutation();

  const items = data?.items ?? [];

  // ============================================================
  // ASSIGN
  // ============================================================

  async function handleAssign(asset: AssetPoolItem) {
    if (!employee) return;

    try {
      await assignAsset({
        id: asset.id,
        employeeId: String(employee.id),
      }).unwrap();

      toast.add({
        title: "Asset assigned",
        description: `${asset.name} assigned to ${employee.name}.`,
        type: "success",
      });

      onClose();
    } catch (error) {
      toast.add({
        title: "Assignment failed",
        description: getErrorMessage(
          error,
          "Could not assign this asset. Please try again.",
        ),
        type: "error",
      });
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="
          flex
          max-h-[80vh]
          w-full
          max-w-2xl
          flex-col
          gap-0
          overflow-hidden
          border
          border-border
          bg-background
          p-0
          shadow-lg
          backdrop-blur-none
        "
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <DialogHeader className="border-b border-border bg-background px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Package className="h-4 w-4 text-muted-foreground" />
            Assign from asset pool
          </DialogTitle>

          <DialogDescription className="text-sm text-muted-foreground">
            {employee
              ? `Choose an available asset to hand to ${employee.name}.`
              : "Choose an available asset."}
          </DialogDescription>
        </DialogHeader>

        {/* ==================================================
            FILTERS
        ================================================== */}

        <div className="flex flex-col gap-2 border-b border-border bg-background px-6 py-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search asset tag, name, serial number..."
              className="
                h-10
                border-border
                bg-background
                pl-9
                text-foreground
                shadow-none
                focus-visible:ring-2
                focus-visible:ring-ring
              "
              autoFocus
            />
          </div>

          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as typeof kind)}
            className="
              h-10
              w-full
              rounded-md
              border
              border-border
              bg-background
              px-3
              text-sm
              text-foreground
              outline-none
              transition-colors
              focus:ring-2
              focus:ring-ring
              sm:w-40
            "
          >
            <option value="">All types</option>
            <option value="HARDWARE">Hardware</option>
            <option value="SOFTWARE">Software</option>
          </select>
        </div>

        {/* ==================================================
            LIST
        ================================================== */}

        <div className="min-h-0 flex-1 overflow-y-auto bg-background px-6 py-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No available assets"
              description="Nothing in the pool matches this search. Try a different filter."
            />
          ) : (
            <ul
              className={[
                "divide-y",
                "divide-border",
                isFetching ? "opacity-70 transition-opacity" : "",
              ].join(" ")}
            >
              {items.map((asset) => (
                <li
                  key={asset.id}
                  className="
                    flex
                    items-center
                    justify-between
                    gap-3
                    py-3
                  "
                >
                  {/* ==================================================
                      ASSET
                  ================================================== */}

                  <div className="flex min-w-0 items-center gap-3">
                    {asset.imageUrl ? (
                      <img
                        src={asset.imageUrl}
                        alt=""
                        className="
                          h-10
                          w-10
                          shrink-0
                          rounded-md
                          border
                          border-border
                          bg-muted
                          object-cover
                        "
                      />
                    ) : (
                      <div
                        className="
                          flex
                          h-10
                          w-10
                          shrink-0
                          items-center
                          justify-center
                          rounded-md
                          border
                          border-border
                          bg-muted
                          text-muted-foreground
                        "
                      >
                        <Package className="h-4 w-4" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {asset.name}
                      </p>

                      <p className="truncate text-xs text-muted-foreground">
                        {asset.assetTag || "No tag"}

                        {asset.serialNumber ? ` · ${asset.serialNumber}` : ""}

                        {asset.quantityAvailable > 1
                          ? ` · ${asset.quantityAvailable} available`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {/* ==================================================
                      ASSIGN
                  ================================================== */}

                  <Button
                    type="button"
                    size="sm"
                    disabled={isAssigning}
                    onClick={() => handleAssign(asset)}
                    className="shrink-0 shadow-none"
                  >
                    {isAssigning ? "Assigning..." : "Assign"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AssetPool;

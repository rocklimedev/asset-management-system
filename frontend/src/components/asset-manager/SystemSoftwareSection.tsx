import { useState } from "react";
import { AppWindow, Plus } from "lucide-react";

import {
  useGetSystemSoftwareQuery,
  useRemoveSoftwareInstallationMutation,
} from "../../services/api/software.api";
import { apiErrorMessage } from "../../types/systems";

import { SoftwareAssignModal } from "./SoftwareAssignModal";
import { Button } from "../ui/button";
import { toast } from "../ui/toast";

type Props = {
  system: {
    id: string;
    name: string;
    systemTag?: string;
    employeeId: string | null;
  };
  /** Disable actions while the parent is busy */
  disabled?: boolean;
};

export function SystemSoftwareSection({ system, disabled }: Props) {
  const [assignOpen, setAssignOpen] = useState(false);

  const {
    data: installations = [],
    isFetching,
    isError,
  } = useGetSystemSoftwareQuery(system.id);

  const [removeInstallation, removeState] =
    useRemoveSoftwareInstallationMutation();

  const busy = disabled || removeState.isLoading;

  async function handleRemove(id: string) {
    try {
      await removeInstallation({ id, notes: "Removed from system" }).unwrap();
      toast.add({ title: "Software removed", type: "success" });
    } catch (error) {
      toast.add({
        title: "Could not remove software",
        description: apiErrorMessage(error),
        type: "error",
      });
    }
  }

  return (
    <div className="border-b p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AppWindow className="h-4 w-4" />
          <h3 className="font-medium">
            Installed software ({installations.length})
          </h3>
          {isFetching ? (
            <span className="text-xs text-muted-foreground">Loading…</span>
          ) : null}
        </div>

        <Button size="sm" disabled={busy} onClick={() => setAssignOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Install software
        </Button>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">
          Could not load installed software.
        </p>
      ) : null}

      <div className="space-y-2">
        {installations.map((install) => (
          <div
            key={install.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
          >
            <AppWindow className="h-5 w-5 text-muted-foreground" />

            <div className="mr-auto">
              <p className="text-sm font-medium">{install.asset?.name}</p>
              <p className="text-xs text-muted-foreground">
                {install.version ? `v${install.version} · ` : ""}
                {install.license
                  ? `${install.license.vendor} · ${install.license.licenseType}`
                  : "No license"}
                {install.installedAt
                  ? ` · Installed ${new Date(install.installedAt).toLocaleDateString()}`
                  : ""}
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => handleRemove(install.id)}
            >
              Remove
            </Button>
          </div>
        ))}

        {!isFetching && !installations.length ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No software installed on this system.
          </div>
        ) : null}
      </div>

      <SoftwareAssignModal
        open={assignOpen}
        system={system}
        installedAssetIds={installations.map((i) => i.assetId)}
        onClose={() => setAssignOpen(false)}
      />
    </div>
  );
}

export default SystemSoftwareSection;

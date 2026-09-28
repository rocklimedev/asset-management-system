import { useState } from "react";
import {
  Monitor,
  Pencil,
  Trash2,
  Package,
  Undo2,
  Cpu,
  HardDrive,
  Wifi,
  Cloud,
  Building2,
  Plus,
  X,
  AppWindow,
  Trash,
} from "lucide-react";

import {
  useGetSystemSpecsQuery,
  useReturnAssetMutation,
  useAssignSystemMutation,
  type Asset,
} from "../../services/api/asset.api";

import {
  useGetSystemSoftwareQuery,
  useRemoveSoftwareInstallationMutation,
} from "../../services/api/software.api";

import { Button } from "../../components/ui/button";
import { toast } from "../../components/ui/toast";

import {
  apiErrorMessage,
  type SystemWithOrganisation,
} from "../../types/systems";

import { SoftwareAssignModal } from "../asset-manager/SoftwareAssignModal";

function SpecItem({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

type Props = {
  system: SystemWithOrganisation | null | undefined;
  busy: boolean;
  onClose: () => void;
  onEdit: (system: SystemWithOrganisation) => void;
  onDelete: (system: SystemWithOrganisation) => void;
  onOpenAssign: () => void;
  onOpenAssetPool: () => void;
  onShowHistory: (asset: Asset) => void;
};

export function SystemDetailDrawer({
  system,
  busy,
  onClose,
  onEdit,
  onDelete,
  onOpenAssign,
  onOpenAssetPool,
  onShowHistory,
}: Props) {
  const [softwareModalOpen, setSoftwareModalOpen] = useState(false);

  const [remove, removeState] = useReturnAssetMutation();
  const [assign, assignState] = useAssignSystemMutation();

  /*
   * ============================================================
   * SYSTEM SPECIFICATIONS
   * ============================================================
   */

  const {
    data: specsResponse,
    isFetching: loadingSpecs,
    isError: specsError,
  } = useGetSystemSpecsQuery(system?.id ?? "", {
    skip: !system?.id,
  });

  const systemSpecs =
    specsResponse && "data" in specsResponse
      ? specsResponse.data
      : specsResponse;

  /*
   * ============================================================
   * SOFTWARE
   * ============================================================
   */

  const {
    data: systemSoftware = [],
    isLoading: loadingSoftware,
    isFetching: fetchingSoftware,
    isError: softwareError,
  } = useGetSystemSoftwareQuery(system?.id ?? "", {
    skip: !system?.id,
  });

  const [removeSoftware, removeSoftwareState] =
    useRemoveSoftwareInstallationMutation();

  /*
   * API RESPONSE:
   *
   * {
   *   softwareAssetId: "...",
   *   systemId: "...",
   *   status: "ACTIVE",
   *   softwareAsset: {
   *     id: "...",
   *     name: "HeidiSQL",
   *     ...
   *   }
   * }
   *
   * Therefore use softwareAssetId here.
   */
  const installedSoftwareAssetIds = systemSoftware.map(
    (installation) => installation.assetId, // was softwareAssetId
  );

  /*
   * ============================================================
   * BUSY STATE
   * ============================================================
   */

  const isBusy =
    busy ||
    removeState.isLoading ||
    assignState.isLoading ||
    removeSoftwareState.isLoading;

  /*
   * ============================================================
   * ASSET COMPONENT ACTIONS
   * ============================================================
   */

  async function removeComponent(assetId: string) {
    try {
      await remove({
        id: assetId,
        notes: "Removed from system",
      }).unwrap();

      toast.add({
        title: "Component removed",
        type: "success",
      });
    } catch (error) {
      toast.add({
        title: "Could not remove component",
        description: apiErrorMessage(error),
        type: "error",
      });
    }
  }

  /*
   * ============================================================
   * SYSTEM ASSIGNMENT
   * ============================================================
   */

  async function returnSystem() {
    if (!system) return;

    try {
      await assign({
        id: system.id,
        employeeId: null,
      }).unwrap();

      toast.add({
        title: "System returned",
        description: "Its components remain together.",
        type: "success",
      });
    } catch (error) {
      toast.add({
        title: "Assignment failed",
        description: apiErrorMessage(error),
        type: "error",
      });
    }
  }

  /*
   * ============================================================
   * SOFTWARE ACTIONS
   * ============================================================
   */

  async function removeInstalledSoftware(installationId: string) {
    try {
      await removeSoftware({
        id: installationId,
        notes: "Software removed from system",
      }).unwrap();

      toast.add({
        title: "Software removed",
        description: "The software installation has been removed.",
        type: "success",
      });
    } catch (error) {
      toast.add({
        title: "Could not remove software",
        description: apiErrorMessage(error),
        type: "error",
      });
    }
  }

  /*
   * ============================================================
   * EMPTY STATE
   * ============================================================
   */

  if (!system) {
    return (
      <div className="flex min-h-80 items-center justify-center rounded-xl border border-dashed p-10 text-center text-muted-foreground">
        <div>
          <Monitor className="mx-auto mb-3 h-10 w-10" />
          <p>Select a system to manage its components and employee.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end lg:static lg:z-auto lg:block">
        {/* Backdrop only used on small screens */}
        <div
          className="fixed inset-0 bg-black/40 lg:hidden"
          onClick={onClose}
        />

        <section className="relative flex h-full w-full max-w-2xl flex-col overflow-y-auto border-l bg-card shadow-xl lg:h-auto lg:w-auto lg:max-w-none lg:rounded-xl lg:border lg:shadow-none">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-3 top-3 lg:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* ============================================================
              HEADER
          ============================================================ */}

          <div className="space-y-4 border-b p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  {system.systemTag}
                </p>

                <h2 className="mt-1 text-xl font-semibold">{system.name}</h2>

                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />

                  <span>{system.organisation?.name ?? "No organisation"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => onEdit(system)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => onDelete(system)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>

            {system.notes && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {system.notes}
              </p>
            )}

            <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Organisation</p>

                <p className="text-sm font-medium">
                  {system.organisation?.name ?? "No organisation"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/40 p-3">
              <div className="mr-auto">
                <p className="text-xs text-muted-foreground">
                  Assigned employee
                </p>

                <p className="text-sm font-medium">
                  {system.employee?.name ?? "Unassigned"}
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={onOpenAssign}
              >
                {system.employeeId ? "Transfer system" : "Assign system"}
              </Button>

              {system.employeeId && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isBusy}
                  onClick={returnSystem}
                >
                  <Undo2 className="mr-2 h-4 w-4" />
                  Return
                </Button>
              )}
            </div>
          </div>

          {/* ============================================================
              SPECIFICATIONS
          ============================================================ */}

          <div className="border-b p-5">
            <div className="rounded-xl border bg-muted/10 p-4">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />

                  <div>
                    <h3 className="font-medium">System Specifications</h3>

                    <p className="text-xs text-muted-foreground">
                      Hardware, operating system, network and cloud
                      configuration.
                    </p>
                  </div>
                </div>

                {loadingSpecs && (
                  <span className="text-xs text-muted-foreground">
                    Loading…
                  </span>
                )}
              </div>

              {specsError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm text-destructive">
                    Could not load system specifications.
                  </p>
                </div>
              ) : loadingSpecs ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div
                      key={item}
                      className="h-16 animate-pulse rounded-lg border bg-muted/40"
                    />
                  ))}
                </div>
              ) : systemSpecs ? (
                <div className="space-y-6">
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-muted-foreground" />

                      <h4 className="text-sm font-medium">Hardware</h4>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <SpecItem
                        label="Processor"
                        value={systemSpecs.processor}
                      />

                      <SpecItem label="RAM" value={systemSpecs.ram} />

                      <SpecItem
                        label="Local Storage"
                        value={systemSpecs.localStorage}
                      />

                      <SpecItem
                        label="Graphics Card"
                        value={systemSpecs.graphicsCard}
                      />

                      <SpecItem
                        label="Motherboard"
                        value={systemSpecs.motherboard}
                      />

                      <SpecItem
                        label="Power Supply"
                        value={systemSpecs.powerSupply}
                      />

                      <SpecItem label="Monitor" value={systemSpecs.monitor} />

                      <SpecItem
                        label="Monitor Size"
                        value={systemSpecs.monitorSize}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-muted-foreground" />

                      <h4 className="text-sm font-medium">
                        Operating System & Network
                      </h4>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <SpecItem
                        label="Operating System"
                        value={systemSpecs.operatingSystem}
                      />

                      <SpecItem
                        label="OS Version"
                        value={systemSpecs.osVersion}
                      />

                      <SpecItem
                        label="MAC Address"
                        value={systemSpecs.macAddress}
                      />

                      <SpecItem
                        label="IP Address"
                        value={systemSpecs.ipAddress}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-muted-foreground" />

                      <h4 className="text-sm font-medium">Cloud Storage</h4>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <SpecItem
                        label="Cloud Storage"
                        value={systemSpecs.cloudStorage}
                      />

                      <SpecItem
                        label="Account Email"
                        value={systemSpecs.cloudStorageEmail}
                      />

                      {systemSpecs.cloudStorageEmail && (
                        <div className="rounded-lg border bg-background p-3">
                          <p className="text-xs text-muted-foreground">
                            Password
                          </p>

                          <p className="mt-1 text-sm font-medium tracking-widest">
                            ••••••••••••
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            Stored securely and hidden.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {systemSpecs.notes && (
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-muted-foreground" />

                        <h4 className="text-sm font-medium">
                          Specification Notes
                        </h4>
                      </div>

                      <div className="rounded-lg border bg-background p-3">
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {systemSpecs.notes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Cpu className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

                  <p className="text-sm font-medium">No specifications added</p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Edit this system to add its hardware and configuration
                    details.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================
              SOFTWARE
          ============================================================ */}

          <div className="border-b p-5">
            <div className="rounded-xl border bg-muted/10 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AppWindow className="h-4 w-4" />

                  <div>
                    <h3 className="font-medium">Software</h3>

                    <p className="text-xs text-muted-foreground">
                      Software installed on this system.
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  disabled={isBusy || !system.employeeId}
                  onClick={() => setSoftwareModalOpen(true)}
                  title={
                    !system.employeeId
                      ? "Assign the system to an employee first"
                      : undefined
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Install software
                </Button>
              </div>

              {!system.employeeId && (
                <div className="mb-4 rounded-lg border border-amber-300/50 bg-amber-50/50 p-3 text-xs text-amber-800">
                  Assign this system to an employee before installing software.
                </div>
              )}

              {softwareError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm text-destructive">
                    Could not load installed software.
                  </p>
                </div>
              ) : loadingSoftware ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-16 animate-pulse rounded-lg border bg-muted/40"
                    />
                  ))}
                </div>
              ) : systemSoftware.length ? (
                <div className="space-y-2">
                  {systemSoftware.map((installation) => {
                    /*
                     * IMPORTANT:
                     * Backend returns `softwareAsset`, not `asset`.
                     */
                    const softwareName =
                      installation.softwareAsset?.name ??
                      installation.asset?.name ??
                      installation.assetId; // was softwareAssetId
                    const softwareAssetTag =
                      installation.softwareAsset?.assetTag;

                    return (
                      <div
                        key={installation.id}
                        className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <AppWindow className="h-4 w-4 text-muted-foreground" />
                        </div>

                        <div className="mr-auto min-w-0">
                          <p className="truncate text-sm font-medium">
                            {softwareName}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            {softwareAssetTag && (
                              <span>{softwareAssetTag}</span>
                            )}

                            {installation.version && (
                              <>
                                <span>·</span>
                                <span>v{installation.version}</span>
                              </>
                            )}

                            <span>·</span>

                            <span>
                              {installation.installationStatus ??
                                installation.assignmentStatus}
                            </span>
                          </div>

                          {installation.license && (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              License: {installation.license.vendor} ·{" "}
                              {installation.license.licenseType}
                            </p>
                          )}

                          {installation.notes && (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {installation.notes}
                            </p>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isBusy}
                          onClick={() =>
                            removeInstalledSoftware(installation.id)
                          }
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <AppWindow className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

                  <p className="text-sm font-medium">No software installed</p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Install software to this system using the button above.
                  </p>
                </div>
              )}

              {fetchingSoftware && !loadingSoftware && (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Updating software…
                </p>
              )}
            </div>
          </div>

          {/* ============================================================
              COMPONENTS
          ============================================================ */}

          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium">
                Components ({system.assignments?.length ?? 0})
              </h3>

              <Button size="sm" disabled={isBusy} onClick={onOpenAssetPool}>
                <Plus className="mr-2 h-4 w-4" />
                Add asset
              </Button>
            </div>

            <div className="space-y-2">
              {system.assignments?.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
                >
                  <Package className="h-5 w-5 text-muted-foreground" />

                  <div className="mr-auto">
                    <p className="text-sm font-medium">
                      {assignment.asset?.name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {assignment.asset?.assetTag ?? "No tag"} ·{" "}
                      {assignment.asset?.category?.name ??
                        assignment.asset?.kind}{" "}
                      · {assignment.asset?.status}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (assignment.asset) {
                        onShowHistory(assignment.asset);
                      }
                    }}
                  >
                    History
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isBusy}
                    onClick={() => removeComponent(assignment.assetId)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            {!system.assignments?.length && (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                No components yet. Add assets from the available pool.
              </div>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              Remove a component to make it available for another system or a
              direct employee assignment.
            </p>
          </div>
        </section>
      </div>

      {/* ============================================================
          SOFTWARE ASSIGN MODAL
      ============================================================ */}

      <SoftwareAssignModal
        open={softwareModalOpen}
        system={{
          id: system.id,
          name: system.name,
          systemTag: system.systemTag,
          employeeId: system.employeeId,
        }}
        installedAssetIds={installedSoftwareAssetIds}
        onClose={() => setSoftwareModalOpen(false)}
      />
    </>
  );
}

export default SystemDetailDrawer;

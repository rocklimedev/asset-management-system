import { useEffect, useState } from "react";
import { Cpu, Wifi, Cloud, HardDrive, Monitor } from "lucide-react";

import {
  useCreateSystemMutation,
  useUpdateSystemMutation,
  useUpsertSystemSpecsMutation,
  useGetSystemSpecsQuery,
} from "../../services/api/asset.api";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { toast } from "../../components/ui/toast";

import {
  emptySpecs,
  specsToForm,
  apiErrorMessage,
  type OrganisationInfo,
  type SpecsForm,
  type SystemWithOrganisation,
} from "../../types/systems";

type Props = {
  open: boolean;
  /** Pass a system to edit it, or omit/null for "new system". */
  system?: SystemWithOrganisation | null;
  organisations: OrganisationInfo[];
  onClose: () => void;
  onSaved: (systemId: string) => void;
};

type EditorState = {
  name: string;
  systemTag: string;
  notes: string;
  organisationId: string;
};

const emptyEditor: EditorState = {
  name: "",
  systemTag: "",
  notes: "",
  organisationId: "",
};

export function CreateUpdateSystemModal({
  open,
  system,
  organisations,
  onClose,
  onSaved,
}: Props) {
  const [editor, setEditor] = useState<EditorState>(emptyEditor);
  const [specsForm, setSpecsForm] = useState<SpecsForm>({ ...emptySpecs });

  const [create, createState] = useCreateSystemMutation();
  const [update, updateState] = useUpdateSystemMutation();
  const [upsertSpecs, upsertSpecsState] = useUpsertSystemSpecsMutation();

  // Fetch fresh specs for the system being edited rather than relying on
  // whatever was embedded in the list row.
  const {
    data: specsResponse,
    isFetching: loadingSpecs,
    isError: specsError,
  } = useGetSystemSpecsQuery(system?.id ?? "", {
    skip: !open || !system?.id,
  });

  const existingSpecs =
    specsResponse && "data" in specsResponse
      ? specsResponse.data
      : specsResponse;

  useEffect(() => {
    if (!open) return;

    if (system) {
      setEditor({
        name: system.name,
        systemTag: system.systemTag,
        notes: system.notes ?? "",
        organisationId: system.organisationId ?? "",
      });
    } else {
      setEditor(emptyEditor);
      setSpecsForm({ ...emptySpecs });
    }
  }, [open, system]);

  useEffect(() => {
    if (open && system?.id) {
      setSpecsForm(specsToForm(existingSpecs));
    }
  }, [open, system?.id, existingSpecs]);

  const busy =
    createState.isLoading ||
    updateState.isLoading ||
    upsertSpecsState.isLoading;

  function updateSpec(field: keyof SpecsForm, value: string) {
    setSpecsForm((current) => ({ ...current, [field]: value }));
  }

  function close() {
    if (busy) return;
    onClose();
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();

    try {
      const body = {
        name: editor.name.trim(),
        systemTag: editor.systemTag.trim(),
        notes: editor.notes.trim() || null,
        organisationId: editor.organisationId || null,
      };

      const result = system
        ? await update({ ...body, id: system.id }).unwrap()
        : await create(body).unwrap();

      const systemId = result.id;

      await upsertSpecs({
        systemId,
        processor: specsForm.processor.trim() || null,
        ram: specsForm.ram.trim() || null,
        localStorage: specsForm.localStorage.trim() || null,
        graphicsCard: specsForm.graphicsCard.trim() || null,
        motherboard: specsForm.motherboard.trim() || null,
        powerSupply: specsForm.powerSupply.trim() || null,
        monitor: specsForm.monitor.trim() || null,
        monitorSize: specsForm.monitorSize.trim() || null,
        operatingSystem: specsForm.operatingSystem.trim() || null,
        osVersion: specsForm.osVersion.trim() || null,
        cloudStorage: specsForm.cloudStorage.trim() || null,
        cloudStorageEmail: specsForm.cloudStorageEmail.trim() || null,
        cloudStoragePassword:
          specsForm.cloudStoragePassword.trim() || undefined,
        macAddress: specsForm.macAddress.trim() || null,
        ipAddress: specsForm.ipAddress.trim() || null,
        notes: specsForm.notes.trim() || null,
      }).unwrap();

      toast.add({ title: "System saved", type: "success" });
      onSaved(systemId);
    } catch (error) {
      toast.add({
        title: "Could not save system",
        description: apiErrorMessage(error),
        type: "error",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{system ? "Edit system" : "New system"}</DialogTitle>

          <DialogDescription>
            A system groups the assets and hardware specifications that make up
            a PC. Organisation is optional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-6">
          {/* ============================================================
              SYSTEM INFORMATION
          ============================================================ */}

          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b pb-2">
              <Monitor className="h-4 w-4" />
              <h3 className="font-medium">System Information</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="system-tag">System tag</Label>
                <Input
                  id="system-tag"
                  required
                  maxLength={100}
                  placeholder="PC-001"
                  value={editor.systemTag}
                  onChange={(e) =>
                    setEditor((c) => ({ ...c, systemTag: e.target.value }))
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
                    setEditor((c) => ({ ...c, name: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="system-organisation">Organisation</Label>

              <select
                id="system-organisation"
                value={editor.organisationId}
                onChange={(e) =>
                  setEditor((c) => ({
                    ...c,
                    organisationId: e.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">No organisation</option>

                {organisations.map((organisation) => (
                  <option key={organisation.id} value={organisation.id}>
                    {organisation.name || organisation.id}
                  </option>
                ))}
              </select>

              <p className="text-xs text-muted-foreground">
                Leave this empty for a system that is not scoped to an
                organisation.
              </p>

              {system?.employeeId &&
                editor.organisationId !== (system.organisationId ?? "") && (
                  <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-700">
                    If the system is currently assigned, the backend will verify
                    that its employee belongs to the selected organisation.
                  </p>
                )}
            </div>

            <div>
              <Label htmlFor="system-notes">System notes</Label>
              <Textarea
                id="system-notes"
                maxLength={5000}
                value={editor.notes}
                onChange={(e) =>
                  setEditor((c) => ({ ...c, notes: e.target.value }))
                }
              />
            </div>
          </div>

          {/* ============================================================
              HARDWARE
          ============================================================ */}

          <div className="space-y-4 rounded-xl border p-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <Cpu className="h-4 w-4" />
              <div>
                <h3 className="font-medium">Hardware Specifications</h3>
                <p className="text-xs text-muted-foreground">
                  Core hardware configuration of this system.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="processor">Processor</Label>
                <Input
                  id="processor"
                  placeholder="Intel Core i7-14700K"
                  value={specsForm.processor}
                  onChange={(e) => updateSpec("processor", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="ram">RAM</Label>
                <Input
                  id="ram"
                  placeholder="32 GB DDR5"
                  value={specsForm.ram}
                  onChange={(e) => updateSpec("ram", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="local-storage">Local Storage</Label>
                <Input
                  id="local-storage"
                  placeholder="1 TB NVMe SSD"
                  value={specsForm.localStorage}
                  onChange={(e) => updateSpec("localStorage", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="graphics-card">Graphics Card</Label>
                <Input
                  id="graphics-card"
                  placeholder="NVIDIA RTX 4070 12GB"
                  value={specsForm.graphicsCard}
                  onChange={(e) => updateSpec("graphicsCard", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="motherboard">Motherboard</Label>
                <Input
                  id="motherboard"
                  placeholder="ASUS ROG STRIX B650"
                  value={specsForm.motherboard}
                  onChange={(e) => updateSpec("motherboard", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="power-supply">Power Supply</Label>
                <Input
                  id="power-supply"
                  placeholder="750W 80+ Gold"
                  value={specsForm.powerSupply}
                  onChange={(e) => updateSpec("powerSupply", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="monitor">Monitor</Label>
                <Input
                  id="monitor"
                  placeholder="Dell U2723QE"
                  value={specsForm.monitor}
                  onChange={(e) => updateSpec("monitor", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="monitor-size">Monitor Size</Label>
                <Input
                  id="monitor-size"
                  placeholder="27 inch"
                  value={specsForm.monitorSize}
                  onChange={(e) => updateSpec("monitorSize", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ============================================================
              OS + NETWORK
          ============================================================ */}

          <div className="space-y-4 rounded-xl border p-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <Wifi className="h-4 w-4" />
              <div>
                <h3 className="font-medium">Operating System & Network</h3>
                <p className="text-xs text-muted-foreground">
                  Software, network and device identification.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="operating-system">Operating System</Label>
                <Input
                  id="operating-system"
                  placeholder="Windows 11 Pro"
                  value={specsForm.operatingSystem}
                  onChange={(e) =>
                    updateSpec("operatingSystem", e.target.value)
                  }
                />
              </div>

              <div>
                <Label htmlFor="os-version">OS Version</Label>
                <Input
                  id="os-version"
                  placeholder="24H2"
                  value={specsForm.osVersion}
                  onChange={(e) => updateSpec("osVersion", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="mac-address">MAC Address</Label>
                <Input
                  id="mac-address"
                  placeholder="00:1A:2B:3C:4D:5E"
                  value={specsForm.macAddress}
                  onChange={(e) => updateSpec("macAddress", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="ip-address">IP Address</Label>
                <Input
                  id="ip-address"
                  placeholder="192.168.1.100"
                  value={specsForm.ipAddress}
                  onChange={(e) => updateSpec("ipAddress", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ============================================================
              CLOUD STORAGE
          ============================================================ */}

          <div className="space-y-4 rounded-xl border p-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <Cloud className="h-4 w-4" />
              <div>
                <h3 className="font-medium">Cloud Storage</h3>
                <p className="text-xs text-muted-foreground">
                  Cloud storage service and account details.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cloud-storage">Cloud Storage</Label>
                <Input
                  id="cloud-storage"
                  placeholder="Google Drive / OneDrive / Dropbox"
                  value={specsForm.cloudStorage}
                  onChange={(e) => updateSpec("cloudStorage", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="cloud-storage-email">Cloud Storage Email</Label>
                <Input
                  id="cloud-storage-email"
                  type="email"
                  placeholder="user@example.com"
                  value={specsForm.cloudStorageEmail}
                  onChange={(e) =>
                    updateSpec("cloudStorageEmail", e.target.value)
                  }
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="cloud-storage-password">
                  Cloud Storage Password
                </Label>
                <Input
                  id="cloud-storage-password"
                  type="password"
                  placeholder={
                    system
                      ? "Leave blank to keep existing password"
                      : "Enter password"
                  }
                  value={specsForm.cloudStoragePassword}
                  onChange={(e) =>
                    updateSpec("cloudStoragePassword", e.target.value)
                  }
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Password is stored securely by the backend and is never loaded
                  back into this form.
                </p>
              </div>
            </div>
          </div>

          {/* ============================================================
              SPEC NOTES
          ============================================================ */}

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <Label htmlFor="spec-notes">Specification Notes</Label>
            </div>
            <Textarea
              id="spec-notes"
              placeholder="Additional hardware or configuration notes..."
              maxLength={5000}
              value={specsForm.notes}
              onChange={(e) => updateSpec("notes", e.target.value)}
            />
          </div>

          {system && loadingSpecs && (
            <p className="text-xs text-muted-foreground">
              Loading existing specifications…
            </p>
          )}

          {system && specsError && (
            <p className="text-sm text-destructive">
              Could not load existing system specifications.
            </p>
          )}

          <div className="flex items-center justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={close}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                busy ||
                loadingSpecs ||
                !editor.name.trim() ||
                !editor.systemTag.trim()
              }
            >
              {busy ? "Saving…" : system ? "Save changes" : "Create system"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateUpdateSystemModal;

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Cpu, HardDrive, MemoryStick, Monitor } from "lucide-react";

import {
  useAssignSystemMutation,
  useCreateSystemMutation,
  useUpsertSystemSpecsMutation,
} from "../../services/api/asset.api";
import { useGetEmployeesQuery, type Employee } from "../../services/api/employees.api";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { toast } from "../ui/toast";
import { cn } from "@/lib/utils";

// ============================================================
// QUICK BUILD COMPUTER
//
// Three steps: name the computer, add its main parts, then review
// and save. Only the name is required. The computer code is filled
// in for you. Giving it to someone is an optional last step.
// The full builder stays available for every specification field.
// ============================================================

interface QuickBuildComputerProps {
  open: boolean;
  onClose: () => void;
  onOpenFullForm: () => void;
  /** Preselects a person, e.g. when opened from their equipment list. */
  employeeId?: string | null;
}

type Step = 1 | 2 | 3;

function errorText(error: unknown) {
  const e = error as { data?: { message?: string }; message?: string };
  return e?.data?.message || e?.message || "Nothing was saved. Please try again.";
}

function newComputerCode() {
  const stamp = Date.now().toString(36).slice(-5).toUpperCase();
  return `PC-${stamp}`;
}

export function QuickBuildComputer({
  open,
  onClose,
  onOpenFullForm,
  employeeId: presetEmployeeId = null,
}: QuickBuildComputerProps) {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [processor, setProcessor] = useState("");
  const [memory, setMemory] = useState("");
  const [storage, setStorage] = useState("");
  const [giveTo, setGiveTo] = useState<string>("");

  const [createSystem, { isLoading: creating }] = useCreateSystemMutation();
  const [upsertSpecs, { isLoading: savingSpecs }] = useUpsertSystemSpecsMutation();
  const [assignSystem, { isLoading: assigning }] = useAssignSystemMutation();
  const saving = creating || savingSpecs || assigning;

  // Loaded up front, not only when the dialog opens, so the list is ready by the last step.
  const { data: employeesData } = useGetEmployeesQuery({});

  const people = useMemo<Employee[]>(() => {
    const list = Array.isArray(employeesData)
      ? employeesData
      : (employeesData?.items ?? []);
    return list.filter((person) => person.status !== "EXITED");
  }, [employeesData]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setName("");
    setCode(newComputerCode());
    setProcessor("");
    setMemory("");
    setStorage("");
    setGiveTo(presetEmployeeId ?? "");
  }, [open, presetEmployeeId]);

  const hasParts = Boolean(processor.trim() || memory.trim() || storage.trim());
  const selectedPerson = people.find((person) => String(person.id) === giveTo) ?? null;

  async function save() {
    try {
      const created = await createSystem({
        name: name.trim(),
        systemTag: code.trim() || newComputerCode(),
        notes: null,
        organisationId: null,
      }).unwrap();

      const systemId = created.id;

      if (hasParts) {
        await upsertSpecs({
          systemId,
          body: {
            processor: processor.trim() || null,
            ram: memory.trim() || null,
            localStorage: storage.trim() || null,
            graphicsCard: null,
            motherboard: null,
            powerSupply: null,
            monitor: null,
            monitorSize: null,
            operatingSystem: null,
            osVersion: null,
            cloudStorage: null,
            cloudStorageEmail: null,
            macAddress: null,
            ipAddress: null,
            notes: null,
          },
        }).unwrap();
      }

      if (giveTo) {
        await assignSystem({ id: systemId, employeeId: giveTo }).unwrap();
      }

      toast.add({
        type: "success",
        title: "Computer built",
        description: selectedPerson
          ? `${name.trim()} is now with ${selectedPerson.name}.`
          : `${name.trim()} is ready to give to someone.`,
      });
      onClose();
    } catch (error) {
      toast.add({
        type: "error",
        title: "Couldn't build this computer",
        description: errorText(error),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !saving && onClose()}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4 text-left">
          <DialogTitle className="text-base font-semibold text-foreground">
            Build a computer
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Step {step} of 3 ·{" "}
            {step === 1 ? "Name it" : step === 2 ? "Main parts" : "Review and save"}
          </DialogDescription>

          <div className="mt-3 grid grid-cols-3 gap-1.5" aria-hidden="true">
            {([1, 2, 3] as Step[]).map((s) => (
              <span
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  s <= step ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {step === 1 && (
            <>
              <div>
                <label htmlFor="qc-name" className="text-sm font-medium text-foreground">
                  What should we call this computer?
                </label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  For example “Finance laptop 2” or “Design workstation”.
                </p>
                <Input
                  id="qc-name"
                  autoFocus
                  value={name}
                  maxLength={255}
                  placeholder="e.g. Finance laptop 2"
                  className="mt-2"
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div>
                <label htmlFor="qc-code" className="text-sm font-medium text-foreground">
                  Computer code
                </label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Filled in for you. Change it only if you already use a code.
                </p>
                <Input
                  id="qc-code"
                  value={code}
                  maxLength={100}
                  className="mt-2 w-48 tabular-nums"
                  onChange={(event) => setCode(event.target.value)}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">
                The main parts. Skip any you don’t know yet; you can add them later.
              </p>

              <PartField id="qc-processor" icon={Cpu} label="Processor" hint="e.g. Intel Core i7-1365U" value={processor} onChange={setProcessor} />
              <PartField id="qc-memory" icon={MemoryStick} label="Memory (RAM)" hint="e.g. 16 GB" value={memory} onChange={setMemory} />
              <PartField id="qc-storage" icon={HardDrive} label="Storage" hint="e.g. 512 GB SSD" value={storage} onChange={setStorage} />

              <button
                type="button"
                onClick={onOpenFullForm}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
                Add monitor, graphics card and other parts in the full builder
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <dl className="divide-y divide-border rounded-lg border border-border bg-card text-sm">
                <SummaryRow label="Name" value={name.trim()} />
                <SummaryRow label="Code" value={code.trim()} />
                <SummaryRow label="Processor" value={processor.trim() || "Not added"} muted={!processor.trim()} />
                <SummaryRow label="Memory" value={memory.trim() || "Not added"} muted={!memory.trim()} />
                <SummaryRow label="Storage" value={storage.trim() || "Not added"} muted={!storage.trim()} />
              </dl>

              <div>
                <label htmlFor="qc-give" className="text-sm font-medium text-foreground">
                  Give it to someone now? <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <select
                  id="qc-give"
                  value={giveTo}
                  onChange={(event) => setGiveTo(event.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-inset outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Not yet, keep it in stock</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-card px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => (step === 1 ? onClose() : setStep((s) => (s - 1) as Step))}
          >
            {step === 1 ? "Cancel" : (
              <>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </>
            )}
          </Button>

          {step < 3 ? (
            <Button
              type="button"
              disabled={step === 1 && !name.trim()}
              onClick={() => setStep((s) => (s + 1) as Step)}
            >
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button type="button" disabled={saving || !name.trim()} onClick={save}>
              <Check className="h-4 w-4" aria-hidden="true" />
              {saving ? "Building…" : "Build computer"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PartField({
  id,
  icon: Icon,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        {label}
      </label>
      <Input id={id} value={value} placeholder={hint} className="mt-1.5" onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function SummaryRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("truncate font-medium", muted ? "text-muted-foreground" : "text-foreground")}>{value}</dd>
    </div>
  );
}

import * as React from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { cn } from "@/lib/utils";

// ============================================================
// CONFIRM DIALOG
//
// A drop-in, accessible replacement for window.confirm().
//
//   const confirm = useConfirm();
//   if (!(await confirm({ title: "Delete asset?", ... }))) return;
//
// - Says what will change before the user commits.
// - The confirm button names the action ("Delete asset"), never "OK".
// - Destructive actions focus "Cancel" first so a stray Enter is safe.
// - Escape, the overlay and Cancel all resolve to `false`.
// ============================================================

export interface ConfirmOptions {
  title: string;
  /** What will happen, in plain language. */
  description?: React.ReactNode;
  /** Label of the confirming button, e.g. "Delete asset". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" shows a warning icon and a red confirm button. */
  tone?: "default" | "danger";
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<Confirm | null>(null);

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<PendingConfirm | null>(null);
  const [open, setOpen] = React.useState(false);
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const confirm = React.useCallback<Confirm>(
    (options) =>
      new Promise<boolean>((resolve) => {
        // A second request while one is open cancels the first.
        setPending((current) => {
          current?.resolve(false);
          return { ...options, resolve };
        });
        setOpen(true);
      }),
    [],
  );

  const settle = React.useCallback(
    (value: boolean) => {
      pending?.resolve(value);
      setOpen(false);
    },
    [pending],
  );

  const danger = pending?.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <Dialog open={open} onOpenChange={(next) => !next && settle(false)}>
        <DialogContent
          showCloseButton={false}
          className="max-w-md"
          onOpenAutoFocus={(event) => {
            // Safe default: focus lands on Cancel.
            event.preventDefault();
            cancelRef.current?.focus();
          }}
        >
          <DialogHeader>
            <div className="flex items-start gap-3">
              {danger && (
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive-muted text-destructive-strong"
                >
                  <AlertTriangle className="h-5 w-5" />
                </span>
              )}

              <div className="min-w-0 space-y-1.5">
                <DialogTitle>{pending?.title}</DialogTitle>

                {pending?.description && (
                  <DialogDescription
                    className={cn("whitespace-pre-line break-words")}
                  >
                    {pending.description}
                  </DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>

          <DialogFooter>
            <Button
              ref={cancelRef}
              type="button"
              variant="outline"
              onClick={() => settle(false)}
            >
              {pending?.cancelLabel ?? "Cancel"}
            </Button>

            <Button
              type="button"
              variant={danger ? "danger" : "default"}
              onClick={() => settle(true)}
            >
              {pending?.confirmLabel ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const confirm = React.useContext(ConfirmContext);

  if (!confirm) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>");
  }

  return confirm;
}

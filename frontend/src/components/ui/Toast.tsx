import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import {
  CircleCheck,
  Info,
  Loader2,
  OctagonX,
  TriangleAlert,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

// ============================================================
// TOAST MANAGER
// Framework-agnostic store so `toast.add({...})` can be called
// from anywhere, including outside the React tree.
// ============================================================

export type ToastType =
  | "success"
  | "info"
  | "warning"
  | "error"
  | "loading"
  | undefined;

export interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  type?: ToastType;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastItem extends ToastOptions {
  id: string;
}

type Listener = (toasts: ToastItem[]) => void;

function createToastManager() {
  let toasts: ToastItem[] = [];
  const listeners = new Set<Listener>();

  const emit = () => {
    const snapshot = toasts;
    listeners.forEach((listener) => listener(snapshot));
  };

  const close = (id: string) => {
    toasts = toasts.filter((item) => item.id !== id);
    emit();
  };

  const add = (options: ToastOptions) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    toasts = [...toasts, { ...options, id }];
    emit();
    return id;
  };

  const update = (id: string, options: ToastOptions) => {
    toasts = toasts.map((item) =>
      item.id === id ? { ...item, ...options } : item,
    );
    emit();
  };

  const clear = () => {
    toasts = [];
    emit();
  };

  return {
    add,
    close,
    update,
    clear,
    subscribe(listener: Listener) {
      listeners.add(listener);
      listener(toasts);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return toasts;
    },
    // Convenience helpers
    success: (options: Omit<ToastOptions, "type">) =>
      add({ ...options, type: "success" }),
    error: (options: Omit<ToastOptions, "type">) =>
      add({ ...options, type: "error" }),
    warning: (options: Omit<ToastOptions, "type">) =>
      add({ ...options, type: "warning" }),
    info: (options: Omit<ToastOptions, "type">) =>
      add({ ...options, type: "info" }),
  };
}

export type ToastManager = ReturnType<typeof createToastManager>;

const toast = createToastManager();

function useToastManager(manager: ToastManager = toast) {
  const [toasts, setToasts] = React.useState<ToastItem[]>(() =>
    manager.getSnapshot(),
  );

  React.useEffect(() => {
    const unsubscribe = manager.subscribe(setToasts);
    return () => {
      unsubscribe();
    };
  }, [manager]);

  return { toasts, ...manager };
}

// ============================================================
// PRIMITIVES
// ============================================================

const ToastProvider = ToastPrimitive.Provider;
const ToastPortal = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    data-slot="toast-viewport"
    className={cn(
      "fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col-reverse gap-2 p-4 outline-none",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    data-slot="toast"
    className={cn(
      "pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-overlay",
      "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4 data-[state=open]:fade-in-0",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-full",
      "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
      "data-[swipe=cancel]:translate-x-0",
      "data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full",
      className,
    )}
    {...props}
  />
));
Toast.displayName = ToastPrimitive.Root.displayName;

const ToastContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="toast-content"
    className={cn("flex min-w-0 flex-1 flex-col gap-1", className)}
    {...props}
  />
));
ToastContent.displayName = "ToastContent";

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title
    ref={ref}
    data-slot="toast-title"
    className={cn("text-sm font-semibold text-foreground", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    data-slot="toast-description"
    className={cn("text-sm leading-5 text-muted-foreground", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    data-slot="toast-action"
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border bg-card px-3 text-[13px] font-medium text-foreground",
      "transition-colors hover:bg-muted",
      "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitive.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, children, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    data-slot="toast-close"
    aria-label="Close notification"
    className={cn(
      "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground",
      "transition-colors hover:bg-muted hover:text-foreground",
      "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
      className,
    )}
    {...props}
  >
    {children ?? <X className="h-4 w-4" />}
  </ToastPrimitive.Close>
));
ToastClose.displayName = ToastPrimitive.Close.displayName;

function ToastIcon({ type }: { type: ToastType }) {
  if (!type) return null;

  const icons: Record<string, React.ReactNode> = {
    success: <CircleCheck className="h-4 w-4 text-success" />,
    info: <Info className="h-4 w-4 text-info" />,
    warning: <TriangleAlert className="h-4 w-4 text-warning" />,
    error: <OctagonX className="h-4 w-4 text-destructive" />,
    loading: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />,
  };

  const icon = icons[type];
  if (!icon) return null;

  return (
    <span data-slot="toast-icon" className="mt-0.5 shrink-0">
      {icon}
    </span>
  );
}

// ============================================================
// TOASTER
// ============================================================

interface ToasterProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Provider> {
  toastManager?: ToastManager;
}

function Toaster({
  children,
  toastManager = toast,
  duration = 5000,
  swipeDirection = "right",
  ...props
}: ToasterProps) {
  const { toasts, close } = useToastManager(toastManager);

  return (
    <ToastProvider
      duration={duration}
      swipeDirection={swipeDirection}
      {...props}
    >
      {children}

      {toasts.map((item) => (
        <Toast
          key={item.id}
          duration={item.type === "loading" ? Infinity : item.duration}
          onOpenChange={(open) => {
            if (!open) close(item.id);
          }}
        >
          <ToastIcon type={item.type} />

          <ToastContent>
            {item.title && <ToastTitle>{item.title}</ToastTitle>}

            {item.description && (
              <ToastDescription>{item.description}</ToastDescription>
            )}
          </ToastContent>

          {item.actionLabel && (
            <ToastAction altText={item.actionLabel} onClick={item.onAction}>
              {item.actionLabel}
            </ToastAction>
          )}

          <ToastClose />
        </Toast>
      ))}

      <ToastViewport />
    </ToastProvider>
  );
}

export {
  Toaster,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  useToastManager,
};

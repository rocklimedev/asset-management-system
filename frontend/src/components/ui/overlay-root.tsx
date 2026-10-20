import * as React from "react";

// ============================================================
// OVERLAY ROOT
//
// Wraps a hand-built modal or drawer so it behaves like a proper
// dialog: announced to screen readers, closes on Escape, keeps Tab
// inside, and returns focus to whatever opened it.
// ============================================================

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface OverlayRootProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose: () => void;
  /** Blocks Escape while a save is running. */
  disableClose?: boolean;
  label?: string;
  labelledBy?: string;
}

export function OverlayRoot({
  onClose,
  disableClose,
  label,
  labelledBy,
  children,
  onKeyDown,
  ...rest
}: OverlayRootProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const node = ref.current;
    const previous = document.activeElement as HTMLElement | null;

    // Respect an input that already took focus via autoFocus.
    if (node && !node.contains(document.activeElement)) node.focus();

    return () => {
      if (previous && document.contains(previous)) previous.focus();
    };
  }, []);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);

    const node = ref.current;
    // Ignore keys from portaled content (e.g. an open Select list).
    if (!node || !node.contains(event.target as Node)) return;

    if (event.key === "Escape" && !event.defaultPrevented) {
      event.stopPropagation();
      if (!disableClose) onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const items = Array.from(
      node.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((el) => el.offsetParent !== null);

    if (items.length === 0) {
      event.preventDefault();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === node)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </div>
  );
}

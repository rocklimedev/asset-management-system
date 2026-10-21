import { Badge, type BadgeTone } from "@/components/ui/badge";
import {
  SOFTWARE_SUBSCRIPTION_OPTIONS,
  SOFTWARE_USAGE_OPTIONS,
  type SoftwareSubscriptionType,
  type SoftwareUsage,
} from "../../services/api/software.api";

// ============================================================
// Small helpers shared by the software list, drawer and wizard.
// ============================================================

const USAGE_TONE: Record<SoftwareUsage, BadgeTone> = {
  IN_USE: "ok",
  NOT_IN_USE: "neutral",
  OCCASIONAL: "info",
  TRIAL: "warn",
  BLOCKED: "danger",
  UNKNOWN: "neutral",
};

export const usageLabel = (usage: SoftwareUsage) =>
  SOFTWARE_USAGE_OPTIONS.find((o) => o.value === usage)?.label ?? usage;

export const licensingLabel = (type: SoftwareSubscriptionType) =>
  SOFTWARE_SUBSCRIPTION_OPTIONS.find((o) => o.value === type)?.label ?? type;

export const fmtDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : "—";

/** Whole days from now until the date. Negative when already past. */
export function daysUntil(value?: string | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime() - Date.now();
  return Number.isNaN(ms) ? null : Math.ceil(ms / 86_400_000);
}

export function UsageBadge({ usage }: { usage: SoftwareUsage }) {
  return (
    <Badge tone={USAGE_TONE[usage] ?? "neutral"}>{usageLabel(usage)}</Badge>
  );
}

/** Shows nothing unless the licence has expired or ends within 30 days. */
export function ExpiryBadge({ expiryDate }: { expiryDate?: string | null }) {
  const days = daysUntil(expiryDate);
  if (days === null || days > 30) return null;
  if (days < 0) return <Badge tone="danger">Expired</Badge>;
  return (
    <Badge tone="warn">
      {days === 0 ? "Expires today" : `Expires in ${days} day${days === 1 ? "" : "s"}`}
    </Badge>
  );
}

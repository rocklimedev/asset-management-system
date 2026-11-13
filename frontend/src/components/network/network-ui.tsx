import type { ReactNode } from 'react';
import {
  Camera,
  Network,
  Plug,
  Router,
  Share2,
  Tv,
  Video,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import type { ConnectionEnd, DeviceKind, NetworkDocument } from '../../types/network';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------
   Device kinds: one source of truth for colour, label and icon.
   The canvas, explorer, legend and inspector all read from here.
------------------------------------------------------------ */

export const KIND_META: Record<DeviceKind, { label: string; color: string; icon: LucideIcon }> = {
  core: { label: 'Core', color: '#7c3aed', icon: Network },
  switch: { label: 'Switch', color: '#2563eb', icon: Share2 },
  router: { label: 'Router', color: '#0f766e', icon: Router },
  nvr: { label: 'NVR', color: '#b45309', icon: Video },
  wifi: { label: 'Wi-Fi AP', color: '#0891b2', icon: Wifi },
  tv: { label: 'Display', color: '#db2777', icon: Tv },
  camera: { label: 'Camera', color: '#64748b', icon: Camera },
  outlet: { label: 'Outlet', color: '#16a34a', icon: Plug },
};

export const KIND_OPTIONS = (Object.keys(KIND_META) as DeviceKind[]).map((kind) => ({
  value: kind,
  label: KIND_META[kind].label,
}));

export function kindColor(kind: DeviceKind) {
  return KIND_META[kind]?.color ?? '#64748b';
}

export function KindIcon({ kind, className }: { kind: DeviceKind; className?: string }) {
  const Icon = KIND_META[kind]?.icon ?? Network;
  return <Icon className={cn('h-4 w-4', className)} style={{ color: kindColor(kind) }} aria-hidden="true" />;
}

/* ------------------------------------------------------------
   Form helpers. Labels, shadcn Select and Input stay consistent
   across the inspector and the toolbar.
------------------------------------------------------------ */

const NONE = '__none__';

export function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * shadcn Select with an optional "empty" choice. Radix does not allow an
 * empty string as a value, so the empty choice uses a sentinel internally.
 */
export function SelectField({
  label,
  id,
  value,
  options,
  onChange,
  emptyLabel,
  className,
}: {
  label: string;
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  emptyLabel?: string;
  className?: string;
}) {
  return (
    <Field label={label} htmlFor={id} className={className}>
      <Select value={value || NONE} onValueChange={(next) => onChange(next === NONE ? '' : next)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {emptyLabel !== undefined && <SelectItem value={NONE}>{emptyLabel}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/** Compact select for toolbars (no label, fixed height). */
export function ToolbarSelect({
  label,
  value,
  options,
  onChange,
  emptyLabel,
  className,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  emptyLabel?: string;
  className?: string;
}) {
  return (
    <Select value={value || NONE} onValueChange={(next) => onChange(next === NONE ? '' : next)}>
      <SelectTrigger aria-label={label} className={cn('h-9 w-auto min-w-44 max-w-64', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {emptyLabel !== undefined && <SelectItem value={NONE}>{emptyLabel}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Titled group inside the inspector. */
export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------
   Labels. Short forms keep rows readable; full paths stay in
   the inspector and tooltips.
------------------------------------------------------------ */

export function deviceLabel(d: NetworkDocument, deviceId: string) {
  const device = d.devices.find((v) => v.id === deviceId);
  return device?.code || device?.name || 'Unknown device';
}

export function shortEnd(d: NetworkDocument, end: ConnectionEnd) {
  const port = d.ports.find((p) => p.id === end.portId);
  return `${deviceLabel(d, end.deviceId)} · ${port ? 'Port ' + port.label : 'no port'}`;
}

export function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

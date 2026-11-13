import { Checkbox } from '@/components/ui/checkbox';
import type { Channel } from '@/services/api/communication.api';

export function errorMessage(error: unknown): string {
  const data = (error as { data?: { message?: string | string[] } })?.data?.message;
  return Array.isArray(data)
    ? data.join(' ')
    : data || 'Request failed. Check your permissions and Zoho connection, then try again.';
}
export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">
      {typeof error === 'string' ? error : errorMessage(error)}
    </p>
  ) : null;
}
export function Status({ value }: { value?: string }) {
  return (
    <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
      {(value || 'NOT STARTED').replace(/_/g, ' ')}
    </span>
  );
}
export function ChannelPicker({
  channels,
  value,
  onChange,
  disabled,
}: {
  channels: Channel[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="max-h-52 space-y-2 overflow-auto rounded-lg border p-3">
      {!channels.length && (
        <p className="text-sm text-muted-foreground">
          Sync the channel directory to load channels.
        </p>
      )}
      {channels.map((c) => (
        <label key={c.id} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value.includes(c.id)}
            disabled={disabled || (!c.isActive && !value.includes(c.id))}
            onCheckedChange={(checked) =>
              onChange(checked ? [...value, c.id] : value.filter((id) => id !== c.id))
            }
          />
          {c.channelName}
          {!c.isActive && ' (inactive)'}
        </label>
      ))}
    </div>
  );
}
export const selectClass =
  'h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

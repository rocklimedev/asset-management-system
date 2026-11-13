import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  useSyncCommunicationChannelsMutation,
  useCommunicationChannelDetailsQuery,
  useCommunicationChannelMembersQuery,
  type Channel,
} from '@/services/api/communication.api';
import { ErrorNotice, Status } from './shared';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}
function ChannelDetails({ channel }: { channel: Channel }) {
  const details = useCommunicationChannelDetailsQuery(channel.id);
  const members = useCommunicationChannelMembersQuery(channel.id);
  const response = record(details.data);
  const info = response.data ? record(response.data) : response;
  return (
    <div className="space-y-4">
      <ErrorNotice error={details.error || members.error} />
      {(details.isLoading || members.isLoading) && <p role="status">Loading channel…</p>}
      <h3 className="font-medium">Channel details</h3>
      {details.data !== undefined && (
        <dl className="space-y-3 text-sm">
          {[
            ['Name', text(info.name) || channel.channelName],
            ['Description', text(info.description) || 'No description'],
            ['Type', text(info.type) || channel.channelType || 'Cliq channel'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      <h3 className="font-medium">Members ({members.data?.items.length ?? '…'})</h3>
      {members.data && (
        <div className="max-h-64 space-y-2 overflow-auto">
          {members.data.items.length ? (
            members.data.items.map((value, index) => {
              const member = record(value);
              return (
                <div key={text(member.user_id) || index} className="rounded-lg border p-3 text-sm">
                  <p className="break-words font-medium">
                    {text(member.display_name) ||
                      text(member.name) ||
                      text(member.email_id) ||
                      text(member.user_id) ||
                      'Channel member'}
                  </p>
                  {!!member.email_id && (
                    <p className="break-words text-muted-foreground">{text(member.email_id)}</p>
                  )}
                  {!!member.role && (
                    <p className="text-xs text-muted-foreground">{text(member.role)}</p>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No members found.</p>
          )}
        </div>
      )}
    </div>
  );
}
export function Channels({
  channels,
  loading,
  error,
}: {
  channels: Channel[];
  loading: boolean;
  error: unknown;
}) {
  const [sync, syncing] = useSyncCommunicationChannelsMutation();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Channel>();
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState<unknown>();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-lg font-semibold">Zoho Cliq channels</h2>
        <Button
          disabled={syncing.isLoading}
          onClick={async () => {
            setFailure(undefined);
            setNotice('');
            try {
              const result = await sync().unwrap();
              setNotice(`Synced ${result.items.length} channels.`);
            } catch (err) {
              setFailure(err);
            }
          }}
        >
          {syncing.isLoading ? 'Syncing…' : 'Sync from Zoho'}
        </Button>
      </div>
      <ErrorNotice error={error || failure} />
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      <Input
        aria-label="Search channels"
        placeholder="Search channels…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading && <p role="status">Loading channels…</p>}
      {!loading && !error && !channels.length && (
        <p className="text-sm text-muted-foreground">
          Sync from Zoho to load your channel directory.
        </p>
      )}
      {channels.length > 0 &&
        !channels.some((c) => c.channelName.toLowerCase().includes(search.toLowerCase())) && (
          <p className="text-sm text-muted-foreground">No matching channels.</p>
        )}
      <div className="grid gap-3 md:grid-cols-2">
        {channels
          .filter((c) => c.channelName.toLowerCase().includes(search.toLowerCase()))
          .map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 space-y-2">
                  <p className="break-words font-medium">{c.channelName}</p>
                  <Status value={c.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  <p className="text-xs text-muted-foreground">{c.channelType || 'Cliq channel'}</p>
                </div>
                <Button variant="outline" onClick={() => setSelected(c)}>
                  View channel
                </Button>
              </CardContent>
            </Card>
          ))}
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(undefined);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.channelName}</DialogTitle>
            <DialogDescription>
              Current channel details and membership from Zoho Cliq.
            </DialogDescription>
          </DialogHeader>
          {selected && <ChannelDetails key={selected.id} channel={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

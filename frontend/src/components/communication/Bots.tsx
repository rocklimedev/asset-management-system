import { useState } from 'react';
import { Bot } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCommunicationBotsQuery, type Bot as BotItem } from '@/services/api/communication.api';
import { ErrorNotice, SearchPill, Status } from './shared';

function isNotFound(error: unknown): boolean {
  return (error as { status?: number })?.status === 404;
}

function BotCard({ bot }: { bot: BotItem }) {
  const channelCount = bot.channelParticipation.length;
  return (
    <Card className="rounded-2xl transition-shadow hover:shadow-md">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-muted text-primary-strong">
            <Bot aria-hidden="true" className="h-5 w-5" />
          </span>
          <Status value={bot.isActive ? 'ACTIVE' : 'INACTIVE'} />
        </div>
        <div className="min-w-0 space-y-1">
          <h3 className="truncate font-semibold">{bot.name}</h3>
          {bot.uniqueName && (
            <p className="truncate text-xs text-muted-foreground">@{bot.uniqueName}</p>
          )}
          {bot.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{bot.description}</p>
          )}
        </div>
        <p className="mt-auto text-xs text-muted-foreground">
          {bot.subscriberCount} {bot.subscriberCount === 1 ? 'subscriber' : 'subscribers'}
          {bot.scope ? ` · ${bot.scope}` : ''}
          {channelCount ? ` · ${channelCount} channel role${channelCount === 1 ? '' : 's'}` : ''}
        </p>
      </CardContent>
    </Card>
  );
}

/** Cliq bots available to the organisation, shown as a searchable card grid. */
export function Bots() {
  const [search, setSearch] = useState('');
  const bots = useCommunicationBotsQuery();
  const query = search.trim().toLowerCase();
  const items = (bots.data?.items ?? []).filter(
    (bot) =>
      !query ||
      bot.name.toLowerCase().includes(query) ||
      (bot.uniqueName ?? '').toLowerCase().includes(query),
  );

  return (
    <section aria-labelledby="bots-heading" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="bots-heading" className="text-lg font-semibold">
            Bots
          </h2>
          <p className="text-sm text-muted-foreground">Cliq bots your team can message and use.</p>
        </div>
        <SearchPill
          label="Search bots"
          placeholder="Search bots…"
          value={search}
          onChange={setSearch}
        />
      </div>

      {bots.error && isNotFound(bots.error) ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            The bot directory isn&apos;t available on the server yet. It will appear here once the
            <code className="mx-1 rounded bg-muted px-1">/communication/bots</code> endpoint is
            added.
          </CardContent>
        </Card>
      ) : (
        <ErrorNotice error={bots.error} />
      )}

      {bots.isLoading && <p role="status">Loading bots…</p>}

      {!bots.isLoading && !bots.error && !items.length && (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {query ? 'No bots match that search.' : 'No bots found in your Cliq organisation.'}
        </p>
      )}

      {items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((bot) => (
            <BotCard key={bot.id} bot={bot} />
          ))}
        </div>
      )}
    </section>
  );
}

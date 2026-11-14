import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Mail, MessageSquare, Plug, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  useZohoStatusQuery,
  useConnectorsQuery,
  useAuthorizeZohoMutation,
  useDisconnectZohoMutation,
  useTestConnectorMutation,
  useToggleConnectorMutation,
} from '@/services/api/connectors.api';

function message(error: unknown): string {
  const value = (error as { data?: { message?: string | string[] }; status?: number })?.data
    ?.message;
  return Array.isArray(value)
    ? value.join(' ')
    : value || 'Could not complete this request. Check your integration permissions and try again.';
}

export default function Connectors() {
  const status = useZohoStatusQuery(undefined, { refetchOnFocus: true, pollingInterval: 30000 });
  const connectors = useConnectorsQuery(undefined, { refetchOnFocus: true });
  const [authorize] = useAuthorizeZohoMutation();
  const [disconnect] = useDisconnectZohoMutation();
  const [test] = useTestConnectorMutation();
  const [toggle] = useToggleConnectorMutation();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const refetchStatus = status.refetch;
  const refetchConnectors = connectors.refetch;
  useEffect(() => {
    const onFocus = () => {
      void refetchStatus();
      void refetchConnectors();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refetchStatus, refetchConnectors]);
  const connected = status.data?.status === 'CONNECTED';
  const refresh = async () => {
    await Promise.all([status.refetch(), connectors.refetch()]);
  };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (err) {
      setError(message(err));
    } finally {
      await refresh();
      setBusy(false);
    }
  };
  const connect = () => {
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    void run(async () => {
      if (!popup)
        throw { data: { message: 'Allow pop-ups for this site, then try connecting again.' } };
      try {
        const result = await authorize().unwrap();
        const url = new URL(result.authorizationUrl);
        if (
          url.protocol !== 'https:' ||
          !/^accounts\.(zoho\.(com|in|eu|com\.au|jp|sa|com\.cn)|zohocloud\.ca)$/.test(url.hostname)
        )
          throw new Error('Invalid authorization URL');
        popup.location.href = url.href;
        setNotice(
          'Complete Zoho authorization in the new tab, then return here and refresh the status.',
        );
      } catch (err) {
        popup.close();
        throw err;
      }
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Link to="/settings" className={buttonVariants({ variant: 'link', className: 'px-0' })}>
        <ArrowLeft aria-hidden="true" />
        Back to settings
      </Link>
      <PageHeader
        title="Connectors"
        description="Connect Zoho to manage your organisation’s email and team communication."
        actions={
          <Button
            variant="outline"
            disabled={busy || status.isFetching || connectors.isFetching}
            onClick={() => void refresh()}
          >
            <RefreshCw aria-hidden="true" />
            Refresh status
          </Button>
        }
      />
      {(error || status.isError || connectors.isError) && (
        <div
          role="alert"
          className="rounded-lg border border-destructive p-4 text-sm text-destructive"
        >
          {error || message(status.error || connectors.error)}
        </div>
      )}
      {notice && (
        <p role="status" className="rounded-lg border bg-muted p-4 text-sm">
          {notice}
        </p>
      )}
      {status.isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading Zoho connection…
        </p>
      ) : (
        status.data && (
          <Card>
            <CardHeader className="flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Plug aria-hidden="true" />
                  Zoho
                </CardTitle>
                <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
                  {status.data.status.replace(/_/g, ' ')}
                </span>
              </div>
              <CardDescription>
                One secure Zoho connection for Mail and Cliq. Sign in with your organisation’s Zoho
                administrator account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <dl className="grid gap-4 text-sm sm:grid-cols-3">
                {[
                  ['Account', status.data.accountEmail || 'Not available'],
                  [
                    'Organisation',
                    status.data.organizationName || status.data.organizationId || 'Not available',
                  ],
                  ['Data centre', status.data.dataCenter?.toUpperCase() || 'Not available'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-words font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              {connected && status.data.missingScopes.length > 0 && (
                <p className="text-sm text-destructive">
                  Additional permissions are required. Reconnect Zoho to grant access.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button onClick={connect} disabled={busy}>
                  <ExternalLink aria-hidden="true" />
                  {connected || status.data.status === 'RECONNECT_REQUIRED'
                    ? 'Reconnect Zoho'
                    : 'Connect Zoho'}
                </Button>
                {status.data.status !== 'DISCONNECTED' && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: 'Disconnect Zoho?',
                          description:
                            'Mail and Cliq will lose access. Existing employees and Zoho accounts will remain. You can reconnect later.',
                          confirmLabel: 'Disconnect Zoho',
                          tone: 'danger',
                        })
                      )
                        void run(async () => {
                          await disconnect().unwrap();
                          setNotice('Zoho disconnected.');
                        });
                    }}
                  >
                    Disconnect
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Connection management requires integration administrator permissions.
              </p>
            </CardContent>
          </Card>
        )
      )}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Available connectors</h2>
        {connectors.isLoading && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading connectors…
          </p>
        )}
        {connectors.data?.items.length === 0 && (
          <p className="text-sm text-muted-foreground">No connectors are configured yet.</p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {connectors.data?.items.map((item) => {
            const Icon = item.provider === 'zoho-mail' ? Mail : MessageSquare;
            return (
              <Card key={item.provider}>
                <CardHeader className="flex-col gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Icon aria-hidden="true" />
                    {item.name}
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-muted px-3 py-1">
                      {item.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <span className="rounded-full bg-muted px-3 py-1">
                      Health: {item.health.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.provider === 'zoho-mail'
                      ? 'Look up and create organisation mail accounts.'
                      : 'Manage team communication accounts and channel memberships.'}
                  </p>
                  {item.lastError && (
                    <p className="break-words text-sm text-destructive">
                      Last error: {item.lastError}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={busy || !connected || !item.enabled}
                      onClick={() =>
                        void run(async () => {
                          const result = await test(item.provider).unwrap();
                          if (!result.healthy)
                            throw { data: { message: `${item.name} connection test failed.` } };
                          setNotice(`${item.name} connection test passed.`);
                        })
                      }
                    >
                      Test connection
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await toggle({
                            provider: item.provider,
                            enabled: !item.enabled,
                          }).unwrap();
                          setNotice(`${item.name} ${item.enabled ? 'disabled' : 'enabled'}.`);
                        })
                      }
                    >
                      {item.enabled ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

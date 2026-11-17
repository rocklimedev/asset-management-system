import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plug, RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useZohoStatusQuery } from '@/services/api/connectors.api';
import type { Channel, Profile } from '@/services/api/communication.api';
import { Channels } from './Channels';
import { Profiles } from './Profiles';
import { StepProgress } from './StepProgress';
import { ErrorNotice, Status } from './shared';

export function CommunicationSetup({
  channels,
  profiles,
  loading,
  error,
  onFinish,
}: {
  channels: Channel[];
  profiles: Profile[];
  loading: boolean;
  error: unknown;
  onFinish: () => void;
}) {
  const [step, setStep] = useState(0);
  const zoho = useZohoStatusQuery(undefined, { refetchOnFocus: true });
  const connected = zoho.data?.status === 'CONNECTED' && !zoho.data.missingScopes?.length;
  return (
    <div className="space-y-5">
      <StepProgress
        steps={['Connect Zoho', 'Sync channels', 'Create profiles', 'Ready to onboard']}
        current={step}
      />
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connect your communication tools</CardTitle>
            <CardDescription>
              Authorize Zoho Mail and Cliq before onboarding employees.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ErrorNotice error={zoho.error} />
            <div className="flex flex-wrap items-center gap-3">
              <Status value={zoho.data?.status} />
              <span className="text-sm text-muted-foreground">{zoho.data?.accountEmail}</span>
            </div>
            {!!zoho.data?.missingScopes?.length && (
              <p className="text-sm text-destructive">
                Reconnect Zoho to grant the required permissions.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Use connector settings to authorize the organisation, enable Mail and Cliq, and test
              both connections. Your administrator also needs to configure the welcome email sender.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/settings/connectors"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'outline' })}
              >
                <Plug aria-hidden="true" />
                Open Zoho settings
              </Link>
              <Button
                variant="outline"
                disabled={zoho.isFetching}
                onClick={() => void zoho.refetch()}
              >
                <RefreshCw aria-hidden="true" />
                Check connection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {step === 1 && <Channels channels={channels} loading={loading} error={error} />}
      {step === 2 && (
        <>
          <p className="text-sm text-muted-foreground">
            Group channels by team or department. Profiles are optional; you can choose custom
            channels during employee onboarding.
          </p>
          <Profiles channels={channels} />
        </>
      )}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Ready for employee onboarding</CardTitle>
            <CardDescription>
              Your communication directory and profiles are ready to use.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              {channels.filter((c) => c.isActive).length} active channels ·{' '}
              {profiles.filter((p) => p.isActive).length} active profiles
            </p>
            <p className="text-muted-foreground">
              Next, choose an employee, assign their channels, enter company email details, and
              review before running onboarding.
            </p>
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
        {step < 3 ? (
          <Button
            disabled={
              (step === 0 && (!connected || zoho.isFetching)) ||
              (step === 1 && (loading || !!error))
            }
            onClick={() => setStep(step + 1)}
          >
            {step === 1 && !channels.length ? 'Continue without channels' : 'Continue'}
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : (
          <Button onClick={onFinish}>
            Onboard an employee
            <ArrowRight aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}

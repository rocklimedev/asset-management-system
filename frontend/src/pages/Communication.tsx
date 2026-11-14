import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plug } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { Profiles } from '@/components/communication/Profiles';
import { Channels } from '@/components/communication/Channels';
import { EmployeeOnboarding } from '@/components/communication/EmployeeOnboarding';
import { ErrorNotice } from '@/components/communication/shared';
import {
  useCommunicationChannelsQuery,
  useCommunicationProfilesQuery,
} from '@/services/api/communication.api';

export default function Communication() {
  const [tab, setTab] = useState<'employees' | 'profiles' | 'channels'>('employees');
  const channels = useCommunicationChannelsQuery();
  const profiles = useCommunicationProfilesQuery();
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <PageHeader
        title="Communication"
        description="Manage Zoho email accounts, Cliq channels and employee communication onboarding."
        actions={
          <Link to="/settings/connectors" className={buttonVariants({ variant: 'outline' })}>
            <Plug aria-hidden="true" />
            Zoho connectors
          </Link>
        }
      />
      <nav aria-label="Communication sections" className="flex flex-wrap gap-2 border-b pb-4">
        {(
          [
            ['employees', 'Employee onboarding'],
            ['profiles', 'Profiles'],
            ['channels', 'Channels'],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            variant={tab === value ? 'default' : 'outline'}
            aria-current={tab === value ? 'page' : undefined}
            onClick={() => setTab(value)}
          >
            {label}
          </Button>
        ))}
      </nav>
      {tab === 'employees' && (
        <>
          <ErrorNotice error={channels.error || profiles.error} />
          <EmployeeOnboarding
            channels={channels.data?.items || []}
            profiles={profiles.data?.items || []}
          />
        </>
      )}
      {tab === 'profiles' && (
        <>
          <ErrorNotice error={channels.error} />
          <Profiles channels={channels.data?.items || []} />
        </>
      )}
      {tab === 'channels' && (
        <Channels
          channels={channels.data?.items || []}
          loading={channels.isLoading}
          error={channels.error}
        />
      )}
    </div>
  );
}

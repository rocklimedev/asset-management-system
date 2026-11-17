import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, ClipboardList, Hash, Layers, Settings, UserPlus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Profiles } from './Profiles';
import { Channels } from './Channels';
import { Bots } from './Bots';
import { EmployeeOnboarding } from './EmployeeOnboarding';
import { NewHire } from './NewHire';
import { CommunicationSetup } from './CommunicationSetup';
import { OnboardingLegend } from './Legend';
import { ErrorNotice } from './shared';
import {
  useCommunicationChannelsQuery,
  useCommunicationProfilesQuery,
} from '@/services/api/communication.api';

function useDirectory() {
  const channels = useCommunicationChannelsQuery();
  const profiles = useCommunicationProfilesQuery();
  return {
    channels,
    profiles,
    channelItems: channels.data?.items || [],
    profileItems: profiles.data?.items || [],
  };
}

const TILES = [
  {
    to: '/communication/onboarding',
    title: 'Onboarding',
    description: 'Run Zoho provisioning for employees already in your team.',
    icon: ClipboardList,
  },
  {
    to: '/communication/channels',
    title: 'Channels',
    description: 'Browse Cliq channels and check who is a member.',
    icon: Hash,
  },
  {
    to: '/communication/bots',
    title: 'Bots',
    description: 'See the Cliq bots available to your organisation.',
    icon: Bot,
  },
  {
    to: '/communication/profiles',
    title: 'Profiles',
    description: 'Reusable channel sets for roles, like Backend developer.',
    icon: Layers,
  },
  {
    to: '/communication/setup',
    title: 'Setup',
    description: 'Naming pattern, company domain and defaults.',
    icon: Settings,
  },
] as const;

export function OverviewPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-6 rounded-3xl border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between md:p-8">
        <div className="max-w-xl space-y-3">
          <p className="text-sm font-medium text-primary">Zoho onboarding</p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Welcome a new hire in one guided flow
          </h2>
          <p className="text-muted-foreground">
            Create the employee, assign their channels, create their Zoho Mail and Cliq accounts,
            and send the welcome email. Each step is checked, so you can see exactly what is left.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/communication/new-hire" className={buttonVariants({ size: 'lg' })}>
            <UserPlus aria-hidden="true" />
            Add a new hire
          </Link>
          <Link
            to="/communication/onboarding"
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            Find an employee
          </Link>
        </div>
      </section>

      <section aria-labelledby="comm-sections" className="space-y-4">
        <h2 id="comm-sections" className="text-lg font-semibold">
          Communication tools
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {TILES.map(({ to, title, description, icon: Icon }) => (
            <Link key={to} to={to} className="group focus-visible:outline-none">
              <Card className="h-full rounded-2xl transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <CardContent className="flex h-full flex-col gap-4 p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-muted text-primary-strong">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-sm text-muted-foreground">{description}</p>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Open{' '}
                    <ArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="comm-legend" className="space-y-4">
        <h2 id="comm-legend" className="text-lg font-semibold">
          How onboarding works
        </h2>
        <OnboardingLegend />
      </section>
    </div>
  );
}

export function OnboardingPage() {
  const { channelItems, profileItems, channels, profiles } = useDirectory();
  return (
    <>
      <ErrorNotice error={channels.error || profiles.error} />
      <EmployeeOnboarding channels={channelItems} profiles={profileItems} />
    </>
  );
}

export function NewHirePage() {
  const { channelItems, profileItems, channels, profiles } = useDirectory();
  return (
    <>
      <ErrorNotice error={channels.error || profiles.error} />
      <NewHire channels={channelItems} profiles={profileItems} />
    </>
  );
}

export function ChannelsPage() {
  const channels = useCommunicationChannelsQuery();
  return (
    <Channels
      channels={channels.data?.items || []}
      loading={channels.isLoading}
      error={channels.error}
    />
  );
}

export function ProfilesPage() {
  const { channelItems, channels } = useDirectory();
  return (
    <>
      <ErrorNotice error={channels.error} />
      <Profiles channels={channelItems} />
    </>
  );
}

export function SetupPage() {
  const navigate = useNavigate();
  const { channelItems, profileItems, channels, profiles } = useDirectory();
  return (
    <CommunicationSetup
      channels={channelItems}
      profiles={profileItems}
      loading={channels.isFetching || profiles.isFetching}
      error={channels.error || profiles.error}
      onFinish={() => navigate('/communication/onboarding')}
    />
  );
}

export function BotsPage() {
  return <Bots />;
}

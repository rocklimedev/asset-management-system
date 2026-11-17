import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { StepProgress } from './StepProgress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  useCommunicationProfilesQuery,
  useSaveCommunicationProfileMutation,
  useDeleteCommunicationProfileMutation,
  type Profile,
  type Channel,
  type ProfileInput,
} from '@/services/api/communication.api';
import { ChannelPicker, ErrorNotice, Status } from './shared';

export function Profiles({ channels }: { channels: Channel[] }) {
  const query = useCommunicationProfilesQuery();
  const [save, saving] = useSaveCommunicationProfileMutation();
  const [remove, removing] = useDeleteCommunicationProfileMutation();
  const [editing, setEditing] = useState<Profile | null | undefined>();
  const [body, setBody] = useState<ProfileInput>({
    name: '',
    code: '',
    description: '',
    isActive: true,
    channelIds: [],
  });
  const [error, setError] = useState<unknown>();
  const [step, setStep] = useState(0);
  const confirm = useConfirm();
  const busy = saving.isLoading || removing.isLoading;
  const open = (profile: Profile | null) => {
    setError(undefined);
    setEditing(profile);
    setStep(0);
    setBody(
      profile
        ? {
            name: profile.name,
            code: profile.code,
            description: profile.description || '',
            channelIds: profile.channelIds,
            isActive: !!profile.isActive,
          }
        : { name: '', code: '', description: '', isActive: true, channelIds: [] },
    );
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (step !== 2) return;
    setError(undefined);
    try {
      await save({ id: editing?.id, body: { ...body, name: body.name.trim() } }).unwrap();
      setEditing(undefined);
    } catch (err) {
      setError(err);
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Communication profiles</h2>
        <Button onClick={() => open(null)}>Create profile</Button>
      </div>
      <ErrorNotice error={query.error || (editing === undefined && error)} />
      {query.isLoading && <p role="status">Loading profiles…</p>}
      {query.data?.items.length === 0 && (
        <p className="rounded-lg border p-6 text-sm text-muted-foreground">
          Create a profile to group the Cliq channels employees need.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {query.data?.items.map((profile) => (
          <Card key={profile.id}>
            <CardHeader className="flex-col">
              <CardTitle>{profile.name}</CardTitle>
              <CardDescription>{profile.code}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Status value={profile.isActive ? 'ACTIVE' : 'INACTIVE'} />
              <p className="text-sm text-muted-foreground">
                {profile.description || 'No description'} · {profile.channelIds.length} channels
              </p>
              <div className="flex gap-2">
                <Button variant="outline" disabled={busy} onClick={() => open(profile)}>
                  Edit
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await confirm({
                        title: `Delete ${profile.name}?`,
                        description: 'Profiles assigned to employees cannot be deleted.',
                        confirmLabel: 'Delete profile',
                        tone: 'danger',
                      })
                    ) {
                      try {
                        setError(undefined);
                        await remove(profile.id).unwrap();
                      } catch (err) {
                        setError(err);
                      }
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog
        open={editing !== undefined}
        onOpenChange={(value) => {
          if (!value && !busy) setEditing(undefined);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit profile' : 'Create profile'}</DialogTitle>
            <DialogDescription>
              Set up a reusable channel plan for a team or department.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <StepProgress
              steps={['Profile details', 'Choose channels', 'Review and save']}
              current={step}
            />
            <ErrorNotice error={error} />
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="comm-name">Name</Label>
                  <Input
                    id="comm-name"
                    required
                    maxLength={120}
                    value={body.name}
                    disabled={busy}
                    onChange={(e) => setBody({ ...body, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comm-code">Code</Label>
                  <Input
                    id="comm-code"
                    required
                    pattern="[A-Z][A-Z0-9_]{1,79}"
                    title="2–80 uppercase letters, numbers or underscores; start with a letter"
                    maxLength={80}
                    value={body.code}
                    disabled={busy}
                    onChange={(e) => setBody({ ...body, code: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comm-description">Description</Label>
                  <Input
                    id="comm-description"
                    maxLength={1000}
                    value={body.description || ''}
                    disabled={busy}
                    onChange={(e) => setBody({ ...body, description: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={body.isActive}
                    disabled={busy}
                    onCheckedChange={(v) => setBody({ ...body, isActive: v === true })}
                  />
                  Active profile
                </label>
              </>
            )}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Channels (up to 100)</p>
                  <ChannelPicker
                    channels={channels}
                    value={body.channelIds}
                    disabled={busy}
                    onChange={(ids) => setBody({ ...body, channelIds: ids })}
                  />
                </div>
              </>
            )}
            {step === 2 && (
              <dl className="space-y-4 rounded-lg border bg-muted/30 p-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Profile</dt>
                  <dd className="font-medium">
                    {body.name} · {body.code}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Description</dt>
                  <dd>{body.description || 'No description'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>{body.isActive ? 'Active' : 'Inactive'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Channels</dt>
                  <dd>
                    {body.channelIds
                      .map((id) => channels.find((c) => c.id === id)?.channelName || id)
                      .join(', ') || 'No channels selected'}
                  </dd>
                </div>
              </dl>
            )}
            <div className="flex items-center justify-between border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => (step === 0 ? setEditing(undefined) : setStep(step - 1))}
              >
                {step === 0 ? (
                  'Cancel'
                ) : (
                  <>
                    <ArrowLeft aria-hidden="true" />
                    Back
                  </>
                )}
              </Button>
              {step < 2 ? (
                <Button
                  type="button"
                  disabled={
                    busy ||
                    !body.name.trim() ||
                    !/^[A-Z][A-Z0-9_]{1,79}$/.test(body.code) ||
                    body.channelIds.length > 100
                  }
                  onClick={() => setStep(step + 1)}
                >
                  Continue
                  <ArrowRight aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={
                    busy ||
                    !body.name.trim() ||
                    !/^[A-Z][A-Z0-9_]{1,79}$/.test(body.code) ||
                    body.channelIds.length > 100
                  }
                >
                  {busy ? 'Saving…' : 'Save profile'}
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

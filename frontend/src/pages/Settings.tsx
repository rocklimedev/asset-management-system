import { useState, type FormEvent } from 'react';
import { LogOut } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResetPasswordMutation, useUpdateProfileMutation } from '../services/api/auth.api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../services/context/AuthContext';

// ============================================================
// SETTINGS
//
// Account details, profile editing and password management.
// ============================================================

function formatRole(role?: string) {
  if (!role) return 'No role assigned';

  return role
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function Settings() {
  const { user, logout, refreshAuth } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation();
  const handleProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError('');
    try {
      const profile = await updateProfile({ name: name.trim(), email: email.trim() }).unwrap();
      localStorage.setItem('user', JSON.stringify({ ...user, ...profile }));
      refreshAuth();
      setProfileOpen(false);
      setProfileSuccess('Profile updated.');
    } catch (err) {
      const message = (err as { data?: { message?: string | string[] } }).data?.message;
      setProfileError(
        Array.isArray(message)
          ? message.join(' ')
          : message || 'Could not update profile. Try again.',
      );
    }
  };
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    try {
      const result = await resetPassword({ currentPassword, newPassword }).unwrap();
      setSuccess(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOpen(false);
    } catch (err) {
      const message = (err as { data?: { message?: string | string[] } }).data?.message;
      setError(
        Array.isArray(message)
          ? message.join(' ')
          : message || 'Could not reset password. Try again.',
      );
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <PageHeader title="Settings" description="Manage your account and password." />

      <Card>
        <CardHeader className="flex-col gap-1">
          <CardTitle>Your account</CardTitle>
          <CardDescription>Your profile and account details.</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-wrap items-center gap-4 text-left">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
              {(user?.name || '?')
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="break-words text-xl font-semibold text-foreground">{user?.name || '—'}</p>
            <p className="break-words text-sm text-muted-foreground">{user?.email || '—'}</p>
            <p className="text-sm font-medium text-primary">{formatRole(user?.role)}</p>
            {profileSuccess && (
              <p role="status" className="text-sm text-success-strong">
                {profileSuccess}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Dialog
              open={profileOpen}
              onOpenChange={(open) => {
                if (savingProfile) return;
                setProfileOpen(open);
                if (open) {
                  setName(user?.name || '');
                  setEmail(user?.email || '');
                  setProfileError('');
                  setProfileSuccess('');
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>Edit profile</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit profile</DialogTitle>
                  <DialogDescription>
                    Update your name and sign-in email. Contact an administrator to change your
                    role.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Name</Label>
                    <Input
                      id="profile-name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={255}
                      disabled={savingProfile}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      maxLength={255}
                      disabled={savingProfile}
                    />
                  </div>
                  {profileError && (
                    <p role="alert" className="text-sm text-destructive">
                      {profileError}
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setProfileOpen(false)}
                      disabled={savingProfile}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingProfile || !name.trim()}>
                      {savingProfile ? 'Saving…' : 'Save changes'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <Button type="button" variant="outline" onClick={() => logout()}>
              <LogOut aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <CardHeader className="min-w-0 flex-1 flex-col gap-1 p-0">
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            Verify your current password and choose a new password with at least 8 characters.
          </CardDescription>
          {success && (
            <p role="status" className="text-sm text-success-strong">
              {success}
            </p>
          )}
        </CardHeader>

        <CardContent className="flex shrink-0 flex-col items-start gap-2 p-0 sm:items-end">
          <Dialog
            open={passwordOpen}
            onOpenChange={(open) => {
              if (isLoading) return;
              setPasswordOpen(open);
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setError('');
              if (open) setSuccess('');
            }}
          >
            <DialogTrigger asChild>
              <Button>Reset password</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset password</DialogTitle>
                <DialogDescription>
                  Enter your current password and choose a new password with at least 8 characters.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Resetting…' : 'Reset password'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="link">Forgot password?</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Forgot password?</DialogTitle>
                <DialogDescription>
                  Contact your ITAM administrator to verify your identity and reset your account
                  password. Email recovery is not available yet.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Organisation-wide preferences, such as notification rules and transfer approvals, are not
        configurable in this version of ITAM.
      </p>
    </div>
  );
}

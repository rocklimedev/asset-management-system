import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import PermissionsWorkspace from '@/components/users/PermissionsWorkspace';
import { useGetRoleAccessQuery } from '@/services/api/role.api';

export default function RolesPermissions() {
  const { data: access, isLoading, isError } = useGetRoleAccessQuery(undefined, {
    refetchOnMountOrArgChange: true,
    pollingInterval: 30000,
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Roles & Permissions" description="Manage roles and choose what each role can access." />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading access…</p>
      ) : isError ? (
        <p role="alert" className="text-sm text-destructive">Unable to verify your permissions. Reload to try again.</p>
      ) : (
        <Card className="overflow-hidden">
          <PermissionsWorkspace canManage={access?.permissions.includes('roles.manage') ?? false} />
        </Card>
      )}
    </div>
  );
}

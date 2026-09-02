import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

interface AppUser { id: number; name: string; email: string; status: string; role: { name: string } }
interface RoleWithPerms { id: number; name: string; description?: string; permissions: { permission: { key: string } }[] }

export default function UsersRoles() {
  const { data: users } = useQuery({ queryKey: ['app-users'], queryFn: async () => (await api.get<AppUser[]>('/users')).data });
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: async () => (await api.get<RoleWithPerms[]>('/roles')).data });

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Users & Roles</h1>
          <p className="text-sm text-slate-500">Manage who can access the IT Management system.</p>
        </div>
        <Button className="w-fit"><UserPlus className="h-4 w-4" /> Add User</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Application Users</h2>
        </div>
        {!users || users.length === 0 ? (
          <div className="p-5"><EmptyState title="No users yet" description="Invite your IT team to give them access." /></div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Email</th>
                <th className="px-5 py-2.5 font-medium">Role</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-5 py-2.5 font-medium text-slate-800">{u.name}</td>
                  <td className="px-5 py-2.5 text-slate-500">{u.email}</td>
                  <td className="px-5 py-2.5"><Badge tone="brand">{u.role.name}</Badge></td>
                  <td className="px-5 py-2.5">
                    <Badge tone={u.status === 'ACTIVE' ? undefined : 'danger'}>{u.status === 'ACTIVE' ? 'Active' : 'Disabled'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">Roles & Permissions</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles?.map((role) => (
            <Card key={role.id} className="p-4">
              <p className="text-sm font-semibold text-slate-900">{role.name}</p>
              <p className="mb-3 text-xs text-slate-500">{role.permissions.length} permissions granted</p>
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.slice(0, 6).map((rp) => (
                  <span key={rp.permission.key} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{rp.permission.key}</span>
                ))}
                {role.permissions.length > 6 && (
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">+{role.permissions.length - 6} more</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

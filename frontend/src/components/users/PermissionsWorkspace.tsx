import { useState } from 'react';
import { ShieldCheck, Plus, Search, Lock } from 'lucide-react';
import {
  useCreateRoleMutation,
  useGetPermissionsQuery,
  useGetRolesQuery,
  useSetRolePermissionsMutation,
  type Role,
  type Permission,
} from '../../services/api/role.api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Fragment } from 'react';
import { useGetRoleAccessQuery } from '../../services/api/role.api';
import { toggleGrant } from './permissions-matrix';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

function message(error: unknown) {
  const value = error as { data?: { message?: string | string[] } };
  const text = value?.data?.message;
  return Array.isArray(text) ? text.join(' ') : text || 'Unable to save changes. Please try again.';
}

function RoleEditor({
  role,
  permissions,
  onClose,
}: {
  role: Role | null;
  permissions: Permission[];
  onClose: () => void;
}) {
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [selected, setSelected] = useState<string[]>((role?.permissions || []).map((p) => p.id));
  const [error, setError] = useState('');
  const [create, { isLoading: creating }] = useCreateRoleMutation();
  const [save, { isLoading: saving }] = useSetRolePermissionsMutation();
  const busy = creating || saving;
  const privileged = ['admin', 'developer'].includes(role?.name?.trim().toLowerCase() || '');
  const groups = [...new Set(permissions.map((p) => (p.key || '').split(/[.:]/)[0]))];
  function toggle(permission: Permission, checked: boolean) {
    setSelected(toggleGrant(selected, permission, checked, permissions));
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!busy}
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{role ? `Permissions for ${role.name}` : 'Create role'}</DialogTitle>
          <DialogDescription>
            Choose the access granted to every user assigned this role.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            try {
              if (role) await save({ id: role.id, permissionIds: selected }).unwrap();
              else
                await create({
                  name: name.trim(),
                  description: description.trim(),
                  permissionIds: selected,
                }).unwrap();
              onClose();
            } catch (error) {
              setError(message(error));
            }
          }}
        >
          {!role && (
            <>
              <label className="block space-y-1 text-sm font-medium">
                Role name
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                  pattern="[a-z][a-z0-9_]*"
                  placeholder="e.g. helpdesk_operator"
                  disabled={busy}
                />
                <span className="text-xs font-normal text-muted-foreground">
                  Lowercase letters, numbers and underscores; start with a letter.
                </span>
              </label>
              <label className="block space-y-1 text-sm font-medium">
                Description
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={255}
                  disabled={busy}
                  placeholder="What is this role responsible for?"
                />
              </label>
            </>
          )}
          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            Credential access covers all employees. User and role administration can grant access to
            sensitive data. Only enable these for trusted people.
          </div>
          {privileged && (
            <p className="text-sm text-muted-foreground">
              Admin and developer must keep all registered permissions. Use “Select all” to add any
              missing grants.
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {selected.length} of {permissions.length} selected
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => setSelected(permissions.map((p) => p.id))}
              >
                Select all
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy || privileged}
                onClick={() => setSelected([])}
              >
                Clear
              </Button>
            </div>
          </div>
          <fieldset disabled={busy} className="space-y-4">
            {groups.map((group) => (
              <div key={group} className="rounded-lg border">
                <h3 className="border-b bg-muted/40 px-3 py-2 text-sm font-semibold capitalize">
                  {group}
                </h3>
                {permissions
                  .filter((p) => (p.key || '').split(/[.:]/)[0] === group)
                  .map((permission) => (
                    <label
                      key={permission.id}
                      className="flex cursor-pointer items-start gap-3 border-b p-3 last:border-0"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-primary"
                        checked={selected.includes(permission.id)}
                        disabled={privileged && selected.includes(permission.id)}
                        onChange={(e) => toggle(permission, e.target.checked)}
                      />
                      <span>
                        <span className="block text-sm font-medium">{permission.key}</span>
                        <span className="text-xs text-muted-foreground">
                          {permission.description}
                        </span>
                      </span>
                    </label>
                  ))}
              </div>
            ))}
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || permissions.length === 0}>
              {busy ? 'Saving…' : role ? 'Save permissions' : 'Create role'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PermissionsWorkspace({ canManage }: { canManage: boolean }) {
  const rolesQuery = useGetRolesQuery();
  const permissionsQuery = useGetPermissionsQuery(undefined, { skip: !canManage });
  const access = useGetRoleAccessQuery();
  const [save, saving] = useSetRolePermissionsMutation();
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [savingRole, setSavingRole] = useState<string>();
  const [search, setSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const roles = Array.isArray(rolesQuery.data) ? rolesQuery.data : rolesQuery.data?.data || [];
  const registered = Array.isArray(permissionsQuery.data)
    ? permissionsQuery.data
    : permissionsQuery.data?.data || [];
  const permissions = canManage
    ? registered
    : [...new Map(roles.flatMap((role) => role.permissions || []).map((p) => [p.id, p])).values()];
  const visible = permissions
    .filter((p) =>
      [p.key, p.name, p.description].join(' ').toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => (a.key || a.id).localeCompare(b.key || b.id));
  const groups = [...new Set(visible.map((p) => (p.key || 'other').split(/[.:]/)[0]))];
  const columns = roles.filter((role) =>
    [role.name, role.description].join(' ').toLowerCase().includes(roleSearch.toLowerCase()),
  );
  const idsFor = (role: Role) => drafts[role.id] || (role.permissions || []).map((p) => p.id);
  const changed = (role: Role) => {
    const saved = new Set((role.permissions || []).map((p) => p.id));
    const ids = idsFor(role);
    return ids.length !== saved.size || ids.some((id) => !saved.has(id));
  };
  const protectedRole = (role: Role) =>
    ['admin', 'developer'].includes(role.name?.trim().toLowerCase() || '');
  const loading = rolesQuery.isLoading || (canManage && permissionsQuery.isLoading);
  const failed = rolesQuery.isError || (canManage && permissionsQuery.isError);
  const busy = saving.isLoading || !!savingRole;
  async function saveRole(role: Role) {
    setSavingRole(role.id);
    setError('');
    setNotice('');
    try {
      await save({ id: role.id, permissionIds: idsFor(role) }).unwrap();
      const result = await rolesQuery.refetch();
      if (result.error) {
        setNotice('Permissions saved. Refresh to verify the latest access.');
        return;
      }
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[role.id];
        return next;
      });
      setNotice('Permissions saved for ' + role.name + '.');
    } catch (err) {
      setError(message(err));
    } finally {
      setSavingRole(undefined);
    }
  }
  return (
    <div className="space-y-5 p-5" aria-busy={busy}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Role permissions matrix
          </h2>
          <p className="text-sm text-muted-foreground">
            Compare access across roles. Change permissions in a column, then save that role.
          </p>
        </div>
        {canManage && (
          <Button
            disabled={loading || failed || busy || !permissions.length}
            onClick={() => setCreating(true)}
          >
            <Plus aria-hidden="true" />
            Create role
          </Button>
        )}
      </div>
      {!canManage && (
        <p className="rounded-lg border p-3 text-sm text-muted-foreground">
          Read-only view. The roles.manage permission is required to change access. Only permissions
          granted to existing roles are shown.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Permissions apply to routes that enforce them. Asset image access uses assets:write; other
        asset and employee actions are not yet covered by these switches.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
          />
          <Input
            className="pl-9"
            aria-label="Search permissions"
            placeholder="Search permissions or descriptions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Input
          aria-label="Filter roles"
          placeholder="Filter role columns…"
          value={roleSearch}
          onChange={(e) => setRoleSearch(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading roles and permissions…
        </p>
      ) : failed ? (
        <div role="alert" className="space-y-2">
          <p>Unable to load the permissions matrix.</p>
          <Button
            variant="outline"
            onClick={() => {
              void rolesQuery.refetch();
              if (canManage) void permissionsQuery.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      ) : !roles.length ? (
        <p className="text-sm text-muted-foreground">
          No roles yet. Create a role to configure access.
        </p>
      ) : !permissions.length ? (
        <p className="text-sm text-muted-foreground">No permissions are available.</p>
      ) : !columns.length || !visible.length ? (
        <p className="text-sm text-muted-foreground">No roles or permissions match your filters.</p>
      ) : (
        <div
          role="region"
          aria-label="Role permissions matrix"
          tabIndex={0}
          className="max-h-[65vh] overflow-auto rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <table className="w-full border-separate border-spacing-0 text-sm">
            <caption className="sr-only">
              Permissions grouped by module, with a column for each role. Checked means access is
              granted. Save each edited role to apply changes.
            </caption>
            <thead className="sticky top-0 z-20 bg-card">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-30 min-w-64 border-b bg-card p-4 text-left"
                >
                  Permission
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {visible.length} shown · {columns.length} roles
                  </span>
                </th>
                {columns.map((role) => (
                  <th
                    scope="col"
                    key={role.id}
                    className="min-w-44 border-b border-l bg-card p-4 text-center align-top"
                  >
                    <p className="font-semibold">{role.name}</p>
                    <p className="mt-1 max-w-56 whitespace-normal text-xs font-normal text-muted-foreground">
                      {role.description || 'No description'}
                    </p>
                    <p className="my-2 text-xs font-normal text-muted-foreground">
                      {idsFor(role).length} permissions{changed(role) ? ' · Unsaved' : ''}
                    </p>
                    {protectedRole(role) && (
                      <span className="mb-2 inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                        <Lock className="h-3 w-3" aria-hidden="true" />
                        Full access required
                      </span>
                    )}
                    {canManage && (
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          disabled={busy || !changed(role)}
                          onClick={() => void saveRole(role)}
                        >
                          {busy && saving.originalArgs?.id === role.id ? 'Saving…' : 'Save'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy || !drafts[role.id]}
                          onClick={() =>
                            setDrafts((previous) => {
                              const next = { ...previous };
                              delete next[role.id];
                              return next;
                            })
                          }
                        >
                          Reset
                        </Button>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group}>
                  <tr>
                    <th
                      scope="rowgroup"
                      colSpan={columns.length + 1}
                      className="border-b bg-muted p-3 text-left font-semibold capitalize"
                    >
                      <span className="sticky left-3">{group}</span>
                    </th>
                  </tr>
                  {visible
                    .filter((p) => (p.key || 'other').split(/[.:]/)[0] === group)
                    .map((permission) => (
                      <tr key={permission.id} className="group">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 min-w-64 max-w-sm border-b bg-card p-3 text-left font-normal group-hover:bg-muted"
                        >
                          <span className="block font-medium">
                            {permission.key || permission.name || permission.id}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {permission.description}
                          </span>
                        </th>
                        {columns.map((role) => {
                          const checked = idsFor(role).includes(permission.id);
                          const selfManage =
                            role.id === access.data?.roleId && permission.key === 'roles.manage';
                          const locked =
                            !canManage || busy || (checked && (protectedRole(role) || selfManage));
                          return (
                            <td
                              key={role.id}
                              className="border-b border-l p-3 text-center group-hover:bg-muted/40"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 cursor-pointer accent-primary disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                aria-label={
                                  (permission.key || permission.name || permission.id) +
                                  ' for ' +
                                  role.name
                                }
                                title={
                                  selfManage
                                    ? 'You must retain your own role management access'
                                    : protectedRole(role)
                                      ? 'Admin and developer must retain all permissions'
                                      : undefined
                                }
                                disabled={locked}
                                checked={checked}
                                onChange={(e) => {
                                  setNotice('');
                                  setDrafts((previous) => ({
                                    ...previous,
                                    [role.id]: toggleGrant(
                                      idsFor(role),
                                      permission,
                                      e.target.checked,
                                      permissions,
                                    ),
                                  }));
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && canManage && (
        <RoleEditor role={null} permissions={permissions} onClose={() => setCreating(false)} />
      )}
    </div>
  );
}

import { useState } from 'react';
import { ShieldCheck, Plus, Search } from 'lucide-react';
import { useCreateRoleMutation, useGetPermissionsQuery, useGetRolesQuery, useSetRolePermissionsMutation, type Role, type Permission } from '../../services/api/role.api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

function message(error: unknown) {
  const value = error as { data?: { message?: string | string[] } };
  const text = value?.data?.message;
  return Array.isArray(text) ? text.join(' ') : text || 'Unable to save changes. Please try again.';
}

function RoleEditor({ role, permissions, onClose }: { role: Role | null; permissions: Permission[]; onClose: () => void }) {
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [selected, setSelected] = useState<string[]>((role?.permissions || []).map(p => p.id));
  const [error, setError] = useState('');
  const [create, { isLoading: creating }] = useCreateRoleMutation();
  const [save, { isLoading: saving }] = useSetRolePermissionsMutation();
  const busy = creating || saving;
  const privileged = ['admin', 'developer'].includes(role?.name?.trim().toLowerCase() || '');
  const groups = [...new Set(permissions.map(p => (p.key || '').split(/[.:]/)[0]))];
  function toggle(permission: Permission, checked: boolean) {
    const next = new Set(selected);
    if (checked) {
      next.add(permission.id);
      if (['credentials.manage', 'credentials.reveal'].includes(permission.key || '')) {
        const read = permissions.find(p => p.key === 'credentials.read');
        if (read) next.add(read.id);
      }
    } else {
      next.delete(permission.id);
      if (permission.key === 'credentials.read') permissions.filter(p => ['credentials.manage', 'credentials.reveal'].includes(p.key || '')).forEach(p => next.delete(p.id));
    }
    setSelected([...next]);
  }
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent showCloseButton={!busy} className="max-h-[90vh] max-w-2xl overflow-y-auto" onEscapeKeyDown={e => { if (busy) e.preventDefault(); }} onPointerDownOutside={e => { if (busy) e.preventDefault(); }}>
      <DialogHeader><DialogTitle>{role ? `Permissions for ${role.name}` : 'Create role'}</DialogTitle><DialogDescription>Choose the access granted to every user assigned this role.</DialogDescription></DialogHeader>
      <form className="space-y-5" onSubmit={async e => {
        e.preventDefault(); setError('');
        try {
          if (role) await save({ id: role.id, permissionIds: selected }).unwrap();
          else await create({ name: name.trim(), description: description.trim(), permissionIds: selected }).unwrap();
          onClose();
        } catch (error) { setError(message(error)); }
      }}>
        {!role && <><label className="block space-y-1 text-sm font-medium">Role name<Input value={name} onChange={e => setName(e.target.value)} required maxLength={100} pattern="[a-z][a-z0-9_]*" placeholder="e.g. helpdesk_operator" disabled={busy} /><span className="text-xs font-normal text-muted-foreground">Lowercase letters, numbers and underscores; start with a letter.</span></label>
          <label className="block space-y-1 text-sm font-medium">Description<Input value={description} onChange={e => setDescription(e.target.value)} maxLength={255} disabled={busy} placeholder="What is this role responsible for?" /></label></>}
        <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">Credential access covers all employees. User and role administration can grant access to sensitive data. Only enable these for trusted people.</div>
        {privileged && <p className="text-sm text-muted-foreground">Admin and developer must keep all registered permissions. Use “Select all” to add any missing grants.</p>}
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{selected.length} of {permissions.length} selected</p><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setSelected(permissions.map(p => p.id))}>Select all</Button><Button type="button" size="sm" variant="outline" disabled={busy || privileged} onClick={() => setSelected([])}>Clear</Button></div></div>
        <fieldset disabled={busy} className="space-y-4">
          {groups.map(group => <div key={group} className="rounded-lg border"><h3 className="border-b bg-muted/40 px-3 py-2 text-sm font-semibold capitalize">{group}</h3>
            {permissions.filter(p => (p.key || '').split(/[.:]/)[0] === group).map(permission => <label key={permission.id} className="flex cursor-pointer items-start gap-3 border-b p-3 last:border-0">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={selected.includes(permission.id)} disabled={privileged && selected.includes(permission.id)} onChange={e => toggle(permission, e.target.checked)} />
              <span><span className="block text-sm font-medium">{permission.key}</span><span className="text-xs text-muted-foreground">{permission.description}</span></span>
            </label>)}
          </div>)}
        </fieldset>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy || permissions.length === 0}>{busy ? 'Saving…' : role ? 'Save permissions' : 'Create role'}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}

export default function PermissionsWorkspace({ canManage }: { canManage: boolean }) {
  const { data: rolesData, isLoading: rolesLoading, isError: rolesError, refetch: reloadRoles } = useGetRolesQuery();
  const { data: permissionsData, isLoading: permissionsLoading, isError: permissionsError, refetch: reloadPermissions } = useGetPermissionsQuery(undefined, { skip: !canManage });
  const roles = Array.isArray(rolesData) ? rolesData : rolesData?.data || [];
  const permissions = Array.isArray(permissionsData) ? permissionsData : permissionsData?.data || [];
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<{ role: Role | null } | null>(null);
  const loading = rolesLoading || (canManage && permissionsLoading);
  const failed = rolesError || (canManage && permissionsError);
  return <div className="space-y-5 p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Permissions workspace</h2><p className="text-sm text-muted-foreground">Create roles, review access, and enable permissions for each role.</p></div>
      {canManage && <Button disabled={loading || failed || !permissions.length} onClick={() => setEditor({ role: null })}><Plus className="mr-2 h-4 w-4" />Create role</Button>}</div>
    {!canManage && <p className="rounded-lg border p-3 text-sm text-muted-foreground">You can review roles. The roles.manage permission is required to create roles or change access.</p>}
    <p className="text-xs text-muted-foreground">Permissions apply to routes that enforce them. Asset image access uses assets:write; other asset and employee actions are not yet covered by these switches.</p>
    <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search roles" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles or descriptions…" /></div>
    {loading ? <p className="text-sm text-muted-foreground">Loading roles and permissions…</p> : failed ? <div role="alert" className="space-y-2 text-sm"><p>Unable to load the permissions workspace.</p><Button variant="outline" onClick={() => { void reloadRoles(); if (canManage) void reloadPermissions(); }}>Retry</Button></div> : <>
      {canManage && !permissions.length && <p className="rounded-lg border p-3 text-sm">No permissions are registered. Run the role-permissions SQL migration before configuring access.</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{roles.filter(role => `${role.name} ${role.description}`.toLowerCase().includes(search.toLowerCase())).map(role => <article key={role.id} className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h3 className="font-semibold">{role.name}</h3></div>
        <p className="text-sm text-muted-foreground">{role.description || 'No description'}</p><p className="text-xs font-medium">{role.permissions?.length || 0} permissions enabled</p>
        <div className="flex flex-wrap gap-1">{(role.permissions || []).map(p => <span key={p.id} className="rounded bg-muted px-2 py-1 text-xs">{p.key || p.name || p.id}</span>)}</div>
        {canManage && <Button className="mt-auto" variant="outline" disabled={!permissions.length} onClick={() => setEditor({ role })}>Configure permissions</Button>}
      </article>)}</div>
      {!roles.some(role => `${role.name} ${role.description}`.toLowerCase().includes(search.toLowerCase())) && <p className="text-sm text-muted-foreground">No roles match your search.</p>}
    </>}
    {editor && canManage && <RoleEditor role={editor.role} permissions={permissions} onClose={() => setEditor(null)} />}
  </div>;
}

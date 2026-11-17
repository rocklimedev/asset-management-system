import type { Permission } from '../../services/api/role.api';

export function toggleGrant(
  ids: string[],
  permission: Permission,
  checked: boolean,
  permissions: Permission[],
): string[] {
  const next = new Set(ids);
  if (checked) {
    next.add(permission.id);
    if (['credentials.manage', 'credentials.reveal'].includes(permission.key || '')) {
      const read = permissions.find((p) => p.key === 'credentials.read');
      if (read) next.add(read.id);
    }
  } else {
    next.delete(permission.id);
    if (permission.key === 'credentials.read') {
      permissions
        .filter((p) => ['credentials.manage', 'credentials.reveal'].includes(p.key || ''))
        .forEach((p) => next.delete(p.id));
    }
  }
  return [...next];
}

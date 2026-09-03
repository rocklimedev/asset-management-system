import { SetMetadata } from '@nestjs/common';

// Attach one or more required permission keys to a route, e.g. @RequirePermissions('asset.transfer')
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

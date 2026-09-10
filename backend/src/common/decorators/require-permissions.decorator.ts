import { SetMetadata } from '@nestjs/common';
import type { AlumniPermissionCode } from '../auth/alumni-permissions';

export const PERMISSIONS_KEY = 'alumni_permissions';

/** Require all listed Alumni permission codes on the AuthenticatedUser. */
export const RequirePermissions = (...permissions: AlumniPermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

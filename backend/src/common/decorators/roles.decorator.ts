import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
/** @deprecated Prefer @RequirePermissions. Accepts AlumniRole codes. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/** Alumni application system roles (seeded in base-module). */
export const AlumniRole = {
  MEMBER: 'ALUMNI_MEMBER',
  ADMIN: 'ALUMNI_ADMIN',
} as const;

export type AlumniRoleCode = (typeof AlumniRole)[keyof typeof AlumniRole];

/** Alumni application permission codes (seeded in application_permissions). */
export const AlumniPermission = {
  PORTAL_ACCESS: 'alumni.portal.access',
  PROFILE_READ: 'alumni.profile.read',
  PROFILE_UPDATE: 'alumni.profile.update',
  DIRECTORY_READ: 'alumni.directory.read',
  EVENTS_READ: 'alumni.events.read',
  NEWS_READ: 'alumni.news.read',
  ADMIN_ACCESS: 'alumni.admin.access',
  ADMIN_MEMBERS_READ: 'alumni.admin.members.read',
  ADMIN_MEMBERS_MANAGE: 'alumni.admin.members.manage',
  ADMIN_EVENTS_MANAGE: 'alumni.admin.events.manage',
  ADMIN_NEWS_MANAGE: 'alumni.admin.news.manage',
  ADMIN_REPORTS_READ: 'alumni.admin.reports.read',
  ADMIN_SETTINGS_MANAGE: 'alumni.admin.settings.manage',
} as const;

export type AlumniPermissionCode =
  (typeof AlumniPermission)[keyof typeof AlumniPermission];

const MEMBER_PERMISSIONS: readonly AlumniPermissionCode[] = [
  AlumniPermission.PORTAL_ACCESS,
  AlumniPermission.PROFILE_READ,
  AlumniPermission.PROFILE_UPDATE,
  AlumniPermission.DIRECTORY_READ,
  AlumniPermission.EVENTS_READ,
  AlumniPermission.NEWS_READ,
];

const ADMIN_PERMISSIONS: readonly AlumniPermissionCode[] = [
  ...MEMBER_PERMISSIONS,
  AlumniPermission.ADMIN_ACCESS,
  AlumniPermission.ADMIN_MEMBERS_READ,
  AlumniPermission.ADMIN_MEMBERS_MANAGE,
  AlumniPermission.ADMIN_EVENTS_MANAGE,
  AlumniPermission.ADMIN_NEWS_MANAGE,
  AlumniPermission.ADMIN_REPORTS_READ,
  AlumniPermission.ADMIN_SETTINGS_MANAGE,
];

/** Static expansion for seeded system roles (matches base-module seed). */
export const ALUMNI_ROLE_PERMISSIONS: Record<
  AlumniRoleCode,
  readonly AlumniPermissionCode[]
> = {
  [AlumniRole.MEMBER]: MEMBER_PERMISSIONS,
  [AlumniRole.ADMIN]: ADMIN_PERMISSIONS,
};

export function permissionsForAlumniRoles(
  roles: AlumniRoleCode[],
): AlumniPermissionCode[] {
  const set = new Set<AlumniPermissionCode>();
  for (const role of roles) {
    const perms = ALUMNI_ROLE_PERMISSIONS[role];
    if (perms) {
      for (const p of perms) set.add(p);
    }
  }
  return [...set];
}

export function isAlumniAdminRole(roles: string[]): boolean {
  return roles.includes(AlumniRole.ADMIN);
}

export function hasAlumniPermission(
  permissions: string[],
  required: AlumniPermissionCode | AlumniPermissionCode[],
): boolean {
  const needed = Array.isArray(required) ? required : [required];
  return needed.every((code) => permissions.includes(code));
}

export type AuthUser = {
  sub: string;
  email?: string;
  username?: string;
  roles: string[];
};

export function getRolesFromRequest(req: {
  user?: { roles?: string[]; realm_access?: { roles?: string[] } };
}): string[] {
  if (req.user?.roles?.length) return req.user.roles;
  return req.user?.realm_access?.roles ?? [];
}

export function isCreatorPending(roles: string[]): boolean {
  return (
    roles.includes('CREATOR_PENDING') && !roles.includes('CREATOR_APPROVED')
  );
}

const ADMIN_ROLES = new Set(["ADMIN", "MODERATOR"]);

export function getRolesFromMetadata(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") return [];
  const roles = (metadata as { roles?: unknown }).roles;
  if (Array.isArray(roles)) {
    return roles.filter((r): r is string => typeof r === "string");
  }
  if (typeof roles === "string") return [roles];
  return [];
}

export function hasAdminAccess(roles: string[]): boolean {
  return roles.some((role) => ADMIN_ROLES.has(role));
}

export function hasCreatorAccess(roles: string[]): boolean {
  return roles.some(
    (role) =>
      role === "CREATOR_PENDING" ||
      role === "CREATOR_APPROVED" ||
      role === "ADMIN" ||
      role === "MODERATOR",
  );
}

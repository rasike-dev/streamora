import { getAccessToken } from "./tokens";

const ADMIN_ROLES = new Set(["ADMIN", "MODERATOR"]);

export function getRolesFromAccessToken(token: string | null): string[] {
  if (!token) return [];
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return payload?.realm_access?.roles ?? [];
  } catch {
    return [];
  }
}

export function hasAdminAccess(roles: string[]): boolean {
  return roles.some((role) => ADMIN_ROLES.has(role));
}

export function canAccessAdminFromToken(token: string | null): boolean {
  return hasAdminAccess(getRolesFromAccessToken(token));
}

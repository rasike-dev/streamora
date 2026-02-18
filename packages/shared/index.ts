export const UserRole = {
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
  CREATOR_PENDING: "CREATOR_PENDING",
  CREATOR_APPROVED: "CREATOR_APPROVED",
  VIEWER: "VIEWER",
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

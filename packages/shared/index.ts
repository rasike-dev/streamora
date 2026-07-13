export const UserRole = {
  ADMIN: "ADMIN",
  MODERATOR: "MODERATOR",
  CREATOR_PENDING: "CREATOR_PENDING",
  CREATOR_APPROVED: "CREATOR_APPROVED",
  VIEWER: "VIEWER",
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export const MediaKind = {
  IMAGE: "IMAGE",
  DOCUMENT: "DOCUMENT",
} as const;

export type MediaKindType = typeof MediaKind[keyof typeof MediaKind];

export const MediaStatus = {
  DRAFT: "DRAFT",
  UPLOADED: "UPLOADED",
  PROCESSING: "PROCESSING",
  PROCESSING_FAILED: "PROCESSING_FAILED",
  READY: "READY",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  PUBLISHED: "PUBLISHED",
  TAKEDOWN: "TAKEDOWN",
  ARCHIVED: "ARCHIVED",
} as const;

export type MediaStatusType = typeof MediaStatus[keyof typeof MediaStatus];

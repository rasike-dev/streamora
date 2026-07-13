export declare const UserRole: {
    readonly ADMIN: "ADMIN";
    readonly MODERATOR: "MODERATOR";
    readonly CREATOR_PENDING: "CREATOR_PENDING";
    readonly CREATOR_APPROVED: "CREATOR_APPROVED";
    readonly VIEWER: "VIEWER";
};
export type UserRoleType = typeof UserRole[keyof typeof UserRole];
export declare const MediaKind: {
    readonly IMAGE: "IMAGE";
    readonly DOCUMENT: "DOCUMENT";
};
export type MediaKindType = typeof MediaKind[keyof typeof MediaKind];
export declare const MediaStatus: {
    readonly DRAFT: "DRAFT";
    readonly UPLOADED: "UPLOADED";
    readonly PROCESSING: "PROCESSING";
    readonly PROCESSING_FAILED: "PROCESSING_FAILED";
    readonly READY: "READY";
    readonly PENDING_APPROVAL: "PENDING_APPROVAL";
    readonly APPROVED: "APPROVED";
    readonly REJECTED: "REJECTED";
    readonly PUBLISHED: "PUBLISHED";
    readonly TAKEDOWN: "TAKEDOWN";
    readonly ARCHIVED: "ARCHIVED";
};
export type MediaStatusType = typeof MediaStatus[keyof typeof MediaStatus];

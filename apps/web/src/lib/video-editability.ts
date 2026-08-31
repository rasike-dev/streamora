/** Keep in sync with apps/api/src/videos/video-visibility.service.ts */
export const VISIBILITY_EDITABLE_STATUSES = [
  "DRAFT",
  "READY",
  "REJECTED",
  "PENDING_APPROVAL",
  "APPROVED",
  "PUBLISHED",
] as const;

/** Keep in sync with apps/api/src/videos/video-schedule.service.ts */
export const SCHEDULE_EDITABLE_STATUSES = [
  "DRAFT",
  "READY",
  "PENDING_APPROVAL",
  "APPROVED",
] as const;

export function isVisibilityEditable(status: string) {
  return (VISIBILITY_EDITABLE_STATUSES as readonly string[]).includes(status);
}

export function isScheduleEditable(status: string) {
  return (SCHEDULE_EDITABLE_STATUSES as readonly string[]).includes(status);
}

export function visibilityDisabledReason(status: string) {
  if (isVisibilityEditable(status)) return null;
  if (status === "UPLOADED" || status === "PROCESSING") {
    return "Visibility can be changed after processing finishes and the video reaches READY status.";
  }
  if (status === "PROCESSING_FAILED") {
    return "Fix processing first, then set visibility once the video is READY.";
  }
  return `Visibility cannot be changed while status is ${status}.`;
}

export function scheduleDisabledReason(status: string) {
  if (isScheduleEditable(status)) return null;
  if (status === "UPLOADED" || status === "PROCESSING") {
    return "Scheduling is available after processing finishes (READY status).";
  }
  if (status === "PROCESSING_FAILED") {
    return "Fix processing first, then schedule once the video is READY.";
  }
  if (status === "PUBLISHED") {
    return "This video is already published. Clear or change schedule before it went live.";
  }
  return `Scheduling is not available while status is ${status}.`;
}

import { BadRequestException } from '@nestjs/common';
import { MediaKind } from '@prisma/client';

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
]);

const DISALLOWED_MIME_TYPES = new Set(['image/svg+xml', 'image/svg']);

export const IMAGE_SIZE_LIMITS = {
  pending: 10 * 1024 * 1024,
  approved: 25 * 1024 * 1024,
} as const;

export const DOCUMENT_SIZE_LIMITS = {
  pending: 25 * 1024 * 1024,
  approved: 200 * 1024 * 1024,
} as const;

export const DAILY_UPLOAD_LIMITS = {
  pending: 5,
  approved: 100,
} as const;

export function sanitizeFilename(filename: string): string {
  const base = filename.replace(/[/\\]/g, '').replace(/\.\./g, '').trim();
  const cleaned = base.replace(/[^\w.\-() ]+/g, '_').slice(0, 200);
  return cleaned || 'upload';
}

export function safeExt(filename: string): string {
  const idx = filename.lastIndexOf('.');
  if (idx < 0) return '';
  const ext = filename.slice(idx).toLowerCase();
  return ext.length <= 10 ? ext : '';
}

export function getMediaBucket(): string {
  return (
    process.env.MEDIA_BUCKET || process.env.GCS_BUCKET || 'streamora-media'
  );
}

export function getMaxBytesForMedia(
  kind: MediaKind,
  isPending: boolean,
): number {
  if (kind === 'IMAGE') {
    return isPending ? IMAGE_SIZE_LIMITS.pending : IMAGE_SIZE_LIMITS.approved;
  }
  return isPending
    ? DOCUMENT_SIZE_LIMITS.pending
    : DOCUMENT_SIZE_LIMITS.approved;
}

export function getAllowedMimeTypes(kind: MediaKind): string[] {
  if (kind === 'IMAGE') return Array.from(IMAGE_MIME_TYPES);
  return Array.from(DOCUMENT_MIME_TYPES);
}

export function assertAllowedContentType(
  kind: MediaKind,
  contentType: string,
): void {
  const normalized = contentType.split(';')[0].trim().toLowerCase();
  if (DISALLOWED_MIME_TYPES.has(normalized)) {
    throw new BadRequestException('SVG uploads are not allowed');
  }
  const allowed = kind === 'IMAGE' ? IMAGE_MIME_TYPES : DOCUMENT_MIME_TYPES;
  if (!allowed.has(normalized)) {
    throw new BadRequestException(
      `Content type not allowed for ${kind}: ${normalized}`,
    );
  }
}

export function buildMediaObjectKey(
  kind: MediaKind,
  mediaItemId: string,
  filename: string,
): string {
  const ext = safeExt(filename) || (kind === 'IMAGE' ? '.bin' : '.bin');
  const prefix = kind === 'IMAGE' ? 'images' : 'documents';
  return `${prefix}/${mediaItemId}/original${ext}`;
}

export function isPdfContentType(contentType: string): boolean {
  return contentType.split(';')[0].trim().toLowerCase() === 'application/pdf';
}

export function shouldInlinePreview(contentType: string): boolean {
  const normalized = contentType.split(';')[0].trim().toLowerCase();
  return IMAGE_MIME_TYPES.has(normalized) || normalized === 'application/pdf';
}

export function getContentDisposition(
  contentType: string,
  _filename: string,
): 'inline' | 'attachment' {
  return shouldInlinePreview(contentType) ? 'inline' : 'attachment';
}

export async function sniffMimeFromBuffer(
  buffer: Buffer,
): Promise<string | undefined> {
  try {
    const fileType = await import('file-type');
    const result = await fileType.fromBuffer(buffer);
    return result?.mime;
  } catch {
    return undefined;
  }
}

export async function validateUploadedMediaContent(
  kind: MediaKind,
  declaredContentType: string,
  buffer: Buffer,
): Promise<string> {
  const sniffed = await sniffMimeFromBuffer(buffer);
  const declared = declaredContentType.split(';')[0].trim().toLowerCase();

  if (sniffed && DISALLOWED_MIME_TYPES.has(sniffed)) {
    throw new BadRequestException('SVG uploads are not allowed');
  }

  const allowed = kind === 'IMAGE' ? IMAGE_MIME_TYPES : DOCUMENT_MIME_TYPES;

  if (sniffed && !allowed.has(sniffed)) {
    throw new BadRequestException(
      `Uploaded file content does not match allowed ${kind} types`,
    );
  }

  if (!allowed.has(declared)) {
    throw new BadRequestException(
      `Declared content type not allowed: ${declared}`,
    );
  }

  if (sniffed && sniffed !== declared) {
    if (!allowed.has(sniffed)) {
      throw new BadRequestException(
        `Content mismatch: declared ${declared}, detected ${sniffed}`,
      );
    }
    return sniffed;
  }

  return declared;
}

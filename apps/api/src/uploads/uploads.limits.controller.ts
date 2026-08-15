import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { MediaKind } from '@prisma/client';
import { getRolesFromRequest } from '../auth/auth-user.util';
import { JwtGuard } from '../auth/jwt.guard';
import {
  DOCUMENT_SIZE_LIMITS,
  getAllowedMimeTypes,
  IMAGE_SIZE_LIMITS,
} from '../media/media-policy.util';

@Controller()
export class UploadLimitsController {
  @Get('uploads/limits')
  @UseGuards(JwtGuard)
  limits(@Req() req: any) {
    const roles = getRolesFromRequest(req);
    const isPending = roles.includes('CREATOR_PENDING');

    return {
      video: {
        maxBytes: isPending ? 250 * 1024 * 1024 : 2 * 1024 * 1024 * 1024,
        maxDailyMinutes: isPending ? 30 : 500,
        allowedTypes: [
          'video/mp4',
          'video/webm',
          'video/quicktime',
          'application/octet-stream',
        ],
      },
      image: {
        maxBytes: isPending
          ? IMAGE_SIZE_LIMITS.pending
          : IMAGE_SIZE_LIMITS.approved,
        allowedTypes: getAllowedMimeTypes('IMAGE' as MediaKind),
      },
      document: {
        maxBytes: isPending
          ? DOCUMENT_SIZE_LIMITS.pending
          : DOCUMENT_SIZE_LIMITS.approved,
        allowedTypes: getAllowedMimeTypes('DOCUMENT' as MediaKind),
      },
      maxUploadsPerDay: isPending ? 5 : 100,
    };
  }
}

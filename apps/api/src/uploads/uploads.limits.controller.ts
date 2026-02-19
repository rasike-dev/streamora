import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';

@Controller()
export class UploadLimitsController {
  @Get('uploads/limits')
  @UseGuards(JwtGuard)
  limits(@Req() req: any) {
    const roles: string[] = req.user?.realm_access?.roles ?? [];
    const isPending = roles.includes('CREATOR_PENDING');

    return {
      maxBytes: isPending ? 250 * 1024 * 1024 : 2 * 1024 * 1024 * 1024,
      maxDailyMinutes: isPending ? 30 : 500, // placeholder; enforce later
      allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'application/octet-stream'],
    };
  }
}

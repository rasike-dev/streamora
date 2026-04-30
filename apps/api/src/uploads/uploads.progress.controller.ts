import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class UploadProgressController {
  constructor(private prisma: PrismaService) {}

  @Post('uploads/:id/progress')
  @UseGuards(JwtGuard)
  async progress(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { uploadedBytes: number; status?: 'UPLOADING' | 'FAILED' },
  ) {
    const sub = req.user?.sub;
    const user = await this.prisma.user.findUnique({
      where: { keycloakSub: sub },
    });
    if (!user) throw new NotFoundException('User not found');

    const intent = await this.prisma.uploadIntent.findUnique({
      where: { id },
      include: { video: true },
    });
    if (!intent) throw new NotFoundException('Upload intent not found');

    // Owner/admin check
    const roles: string[] = req.user?.realm_access?.roles ?? [];
    const isAdmin = roles.includes('ADMIN');

    if (
      !isAdmin &&
      intent.video.uploaderId &&
      intent.video.uploaderId !== user.id
    ) {
      throw new ForbiddenException('Not allowed');
    }

    const uploaded = Math.max(
      0,
      Math.min(body.uploadedBytes ?? 0, Number(intent.sizeBytes)),
    );

    const data: any = {
      uploadedBytes: BigInt(uploaded),
      status: body.status ?? 'UPLOADING',
      startedAt: intent.startedAt ?? new Date(),
      lastError: null,
    };

    await this.prisma.uploadIntent.update({
      where: { id },
      data,
    });

    return { ok: true };
  }
}

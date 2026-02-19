import { Controller, Param, Post, Req, UseGuards, NotFoundException, ForbiddenException } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class UploadCompleteController {
  constructor(private prisma: PrismaService) {}

  @Post('uploads/:id/complete')
  @UseGuards(JwtGuard)
  async complete(@Req() req: any, @Param('id') id: string) {
    const sub = req.user?.sub;
    const user = await this.prisma.user.findUnique({ where: { keycloakSub: sub } });
    if (!user) throw new NotFoundException('User not found');

    const intent = await this.prisma.uploadIntent.findUnique({
      where: { id },
      include: { video: true },
    });
    if (!intent) throw new NotFoundException('Upload intent not found');

    const roles: string[] = req.user?.realm_access?.roles ?? [];
    const isAdmin = roles.includes('ADMIN');

    if (!isAdmin && intent.video.uploaderId && intent.video.uploaderId !== user.id) {
      throw new ForbiddenException('Not allowed');
    }

    await this.prisma.uploadIntent.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        uploadedBytes: intent.sizeBytes,
        completedAt: new Date(),
        lastError: null,
      },
    });

    return { ok: true };
  }
}

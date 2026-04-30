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
export class UploadFailController {
  constructor(private prisma: PrismaService) {}

  @Post('uploads/:id/fail')
  @UseGuards(JwtGuard)
  async fail(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { error: string; uploadedBytes?: number },
  ) {
    console.log(`[${req.requestId}] uploads.fail`, {
      uploadIntentId: id,
      error: body.error,
      uploadedBytes: body.uploadedBytes,
    });

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

    const roles: string[] = req.user?.realm_access?.roles ?? [];
    const isAdmin = roles.includes('ADMIN');

    if (
      !isAdmin &&
      intent.video.uploaderId &&
      intent.video.uploaderId !== user.id
    ) {
      throw new ForbiddenException('Not allowed');
    }

    const uploaded = body.uploadedBytes ?? Number(intent.uploadedBytes);

    await this.prisma.uploadIntent.update({
      where: { id },
      data: {
        status: 'FAILED',
        uploadedBytes: BigInt(Math.max(0, uploaded)),
        lastError: (body.error ?? 'Unknown error').slice(0, 1000),
      },
    });

    return { ok: true };
  }
}

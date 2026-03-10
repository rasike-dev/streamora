import { Body, Controller, Post, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(private prisma: PrismaService) {}

  @Post('admin/users/:id/creator-approve')
  async approveCreator(@Param('id') userId: string) {
    const profile = await this.prisma.creatorProfile.upsert({
      where: { userId },
      update: { approval: 'APPROVED' },
      create: { userId, approval: 'APPROVED' },
    });

    // Optional: flip uploaderVisible for all their videos (or keep per-video)
    await this.prisma.video.updateMany({
      where: { uploaderId: userId },
      data: { uploaderVisible: true }, // you can keep this false if you prefer
    });

    return { ok: true, userId: profile.userId, approval: profile.approval };
  }

  @Post('admin/users/:id/creator-reject')
  async rejectCreator(@Param('id') userId: string) {
    const profile = await this.prisma.creatorProfile.upsert({
      where: { userId },
      update: { approval: 'REJECTED' },
      create: { userId, approval: 'REJECTED' },
    });

    return { ok: true, userId: profile.userId, approval: profile.approval };
  }

  @Post('admin/users/:id/notes')
  async notes(@Param('id') userId: string, @Body() body: { notes: string }) {
    const profile = await this.prisma.creatorProfile.upsert({
      where: { userId },
      update: { notes: (body.notes ?? '').slice(0, 2000) },
      create: { userId, notes: (body.notes ?? '').slice(0, 2000) },
    });

    return { ok: true, userId: profile.userId };
  }
}

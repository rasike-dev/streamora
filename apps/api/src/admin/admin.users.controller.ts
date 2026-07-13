import { Body, Controller, Post, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ClerkService } from '../auth/clerk.service';

@Controller()
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
  constructor(
    private prisma: PrismaService,
    private clerk: ClerkService,
  ) {}

  @Post('admin/users/:id/creator-approve')
  async approveCreator(@Param('id') userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { ok: false, error: 'User not found' };
    }

    const profile = await this.prisma.creatorProfile.upsert({
      where: { userId },
      update: { approval: 'APPROVED' },
      create: { userId, approval: 'APPROVED' },
    });

    await this.prisma.video.updateMany({
      where: { uploaderId: userId },
      data: { uploaderVisible: true },
    });

    await this.prisma.mediaItem.updateMany({
      where: { uploaderId: userId },
      data: { uploaderVisible: true },
    });

    await this.clerk.promoteCreatorToApproved(user.externalId);

    return { ok: true, userId: profile.userId, approval: profile.approval };
  }

  @Post('admin/users/:id/creator-reject')
  async rejectCreator(@Param('id') userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { ok: false, error: 'User not found' };
    }

    const profile = await this.prisma.creatorProfile.upsert({
      where: { userId },
      update: { approval: 'REJECTED' },
      create: { userId, approval: 'REJECTED' },
    });

    await this.clerk.demoteCreatorToPending(user.externalId);

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

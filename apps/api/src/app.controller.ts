import {
  Controller,
  Get,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtGuard } from './auth/jwt.guard';
import { Roles } from './auth/roles.decorator';
import { RolesGuard } from './auth/roles.guard';
import { getRolesFromRequest } from './auth/auth-user.util';
import { PrismaService } from './prisma/prisma.service';
import { ClerkService } from './auth/clerk.service';

@Controller()
export class AppController {
  constructor(
    private prisma: PrismaService,
    private clerk: ClerkService,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'streamora-api' };
  }

  @Get('version')
  version() {
    return { version: '0.0.1' };
  }

  @Get('me')
  @UseGuards(JwtGuard)
  async me(@Req() req: any) {
    const externalId = req.user?.sub;
    const email = req.user?.email;
    const username = req.user?.preferred_username;

    if (!externalId) {
      throw new BadRequestException('Invalid user sub');
    }

    const tokenRoles = getRolesFromRequest(req);
    const roles =
      tokenRoles.length > 0
        ? tokenRoles
        : await this.clerk.ensureDefaultRoles(externalId);

    const user = await this.prisma.user.upsert({
      where: { externalId },
      update: {
        email: email || undefined,
        username: username || undefined,
        displayName: username || undefined,
      },
      create: {
        externalId,
        email: email || undefined,
        username: username || undefined,
        displayName: username || undefined,
      },
    });

    await this.prisma.creatorProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        approval: 'PENDING',
      },
    });

    const existingRoles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
    });

    const existingRoleNames = existingRoles.map((r) => r.role);
    const rolesToAdd = roles.filter(
      (r: string) => !existingRoleNames.includes(r),
    );
    const rolesToRemove = existingRoleNames.filter(
      (r) => !roles.includes(r),
    );

    if (rolesToAdd.length > 0) {
      await this.prisma.userRole.createMany({
        data: rolesToAdd.map((role: string) => ({
          userId: user.id,
          role,
        })),
      });
    }

    if (rolesToRemove.length > 0) {
      await this.prisma.userRole.deleteMany({
        where: {
          userId: user.id,
          role: { in: rolesToRemove },
        },
      });
    }

    const finalRoles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
      select: { role: true },
    });

    return {
      id: user.id,
      sub: externalId,
      username: user.username,
      email: user.email,
      roles: finalRoles.map((r) => r.role),
    };
  }

  @Get('admin/ping')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  adminPing() {
    return { ok: true, scope: 'admin' };
  }
}

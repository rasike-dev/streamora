import { Controller, Get, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtGuard } from './auth/jwt.guard';
import { Roles } from './auth/roles.decorator';
import { RolesGuard } from './auth/roles.guard';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

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
    const keycloakSub = req.user?.sub;
    const email = req.user?.email;
    const username = req.user?.preferred_username;
    const keycloakRoles = req.user?.realm_access?.roles ?? [];

    if (!keycloakSub) {
      throw new BadRequestException('Invalid user sub');
    }

    // Upsert user
    const user = await this.prisma.user.upsert({
      where: { keycloakSub },
      update: {
        email: email || undefined,
        username: username || undefined,
        displayName: username || undefined,
      },
      create: {
        keycloakSub,
        email: email || undefined,
        username: username || undefined,
        displayName: username || undefined,
      },
    });

    // Ensure creator profile exists
    await this.prisma.creatorProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        approval: 'PENDING',
      },
    });

    // Sync roles
    const existingRoles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
    });

    const existingRoleNames = existingRoles.map((r) => r.role);
    const rolesToAdd = keycloakRoles.filter((r: string) => !existingRoleNames.includes(r));
    const rolesToRemove = existingRoleNames.filter((r) => !keycloakRoles.includes(r));

    // Add new roles
    if (rolesToAdd.length > 0) {
      await this.prisma.userRole.createMany({
        data: rolesToAdd.map((role: string) => ({
          userId: user.id,
          role,
        })),
      });
    }

    // Remove old roles
    if (rolesToRemove.length > 0) {
      await this.prisma.userRole.deleteMany({
        where: {
          userId: user.id,
          role: { in: rolesToRemove },
        },
      });
    }

    // Get final roles
    const finalRoles = await this.prisma.userRole.findMany({
      where: { userId: user.id },
      select: { role: true },
    });

    return {
      id: user.id,
      sub: keycloakSub,
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

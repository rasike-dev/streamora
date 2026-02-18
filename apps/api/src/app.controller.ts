import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from './auth/jwt.guard';
import { Roles } from './auth/roles.decorator';
import { RolesGuard } from './auth/roles.guard';

@Controller()
export class AppController {
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
  me(@Req() req: any) {
    const roles = req.user?.realm_access?.roles ?? [];
    return {
      sub: req.user?.sub,
      username: req.user?.preferred_username,
      email: req.user?.email,
      roles,
    };
  }

  @Get('admin/ping')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  adminPing() {
    return { ok: true, scope: 'admin' };
  }
}

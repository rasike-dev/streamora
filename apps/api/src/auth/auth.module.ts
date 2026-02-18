import { Module } from '@nestjs/common';
import { JwtGuard } from './jwt.guard';
import { RolesGuard } from './roles.guard';

@Module({
  providers: [JwtGuard, RolesGuard],
  exports: [JwtGuard, RolesGuard],
})
export class AuthModule {}

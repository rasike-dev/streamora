import { Module } from '@nestjs/common';
import { JwtGuard } from './jwt.guard';
import { RolesGuard } from './roles.guard';
import { ClerkService } from './clerk.service';

@Module({
  providers: [JwtGuard, RolesGuard, ClerkService],
  exports: [JwtGuard, RolesGuard, ClerkService],
})
export class AuthModule {}

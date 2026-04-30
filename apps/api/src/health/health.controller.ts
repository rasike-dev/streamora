import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async ready() {
    const checks: Record<string, string> = {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };

    // Check database connection
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.db = 'ok';
    } catch (error) {
      checks.db = 'error';
    }

    // Check Redis if configured
    const redisHost = process.env.REDIS_HOST;
    if (redisHost) {
      try {
        // Simple check - if Redis module is available, it would be injected
        // For now, just check if env var is set
        checks.redis = 'configured';
      } catch (error) {
        checks.redis = 'error';
      }
    } else {
      checks.redis = 'not_configured';
    }

    const allOk = checks.db === 'ok';
    return {
      ...checks,
      ready: allOk,
    };
  }
}

import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Rate limiting configuration
 * Global: 120 requests per minute per IP
 * Analytics: 60 requests per minute (more restrictive)
 */
export const rateLimitConfig: ThrottlerModuleOptions = {
  throttlers: [
    {
      ttl: 60000, // 1 minute in milliseconds
      limit: parseInt(process.env.API_RATE_LIMIT || '120', 10),
    },
  ],
};

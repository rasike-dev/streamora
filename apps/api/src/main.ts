import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Enable graceful shutdown hooks
    bufferLogs: true,
  });

  // Enable shutdown hooks for graceful shutdown
  app.enableShutdownHooks();

  // CORS configuration - allow trusted origins
  const configuredOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const defaultDevOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  const allowedOrigins = Array.from(
    new Set([...configuredOrigins, ...defaultDevOrigins]),
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Non-browser requests (no Origin header) are allowed.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`streamora-api listening on http://localhost:${port}`);
}

bootstrap();

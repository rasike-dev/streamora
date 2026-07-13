import { MediaAuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export async function writeMediaAuditLog(
  prisma: PrismaService,
  input: {
    mediaItemId: string;
    action: MediaAuditAction;
    actorUserId: string;
    metadata?: Record<string, unknown>;
  },
) {
  await prisma.mediaAuditLog.create({
    data: {
      mediaItemId: input.mediaItemId,
      action: input.action,
      actorUserId: input.actorUserId,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

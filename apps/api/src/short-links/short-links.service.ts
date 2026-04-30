import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class ShortLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserByKeycloakSub(keycloakSub: string) {
    return this.prisma.user.findUnique({
      where: { keycloakSub },
      include: {
        roles: true,
      },
    });
  }

  async createOrGetShortLink(videoId: string, actorUserId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        slug: true,
        uploaderId: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Check if user is owner or admin
    const user = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      include: {
        roles: true,
      },
    });

    const isAdmin = user?.roles.some((r) => r.role === 'ADMIN');
    const isOwner = video.uploaderId === actorUserId;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You cannot create a share link for this video',
      );
    }

    // Find existing short link for this video
    const existing = await this.prisma.shortLink.findFirst({
      where: { videoId: video.id },
      select: {
        code: true,
        videoId: true,
      },
    });

    const code = existing?.code ?? (await this.generateUniqueCode());

    if (!existing) {
      await this.prisma.shortLink.create({
        data: {
          code,
          videoId: video.id,
          createdByUserId: actorUserId,
        },
      });
    }

    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_BASE_URL ||
      'http://localhost:3000';

    return {
      code,
      shortUrl: `${appBaseUrl}/s/${code}`,
      targetUrl: `/en/v/${video.slug}?src=share`,
    };
  }

  async resolveShortLink(code: string, locale: string) {
    const shortLink = await this.prisma.shortLink.findUnique({
      where: { code },
      select: {
        code: true,
        video: {
          select: {
            id: true,
            slug: true,
            status: true,
            visibility: true,
          },
        },
      },
    });

    if (!shortLink?.video) {
      throw new NotFoundException('Short link not found');
    }

    const isPubliclyResolvable =
      shortLink.video.status === 'PUBLISHED' &&
      (shortLink.video.visibility === 'PUBLIC' ||
        shortLink.video.visibility === 'UNLISTED');

    if (!isPubliclyResolvable) {
      throw new NotFoundException('Short link not found');
    }

    return {
      code: shortLink.code,
      target: {
        videoId: shortLink.video.id,
        slug: shortLink.video.slug,
        locale,
        redirectUrl: `/${locale}/v/${shortLink.video.slug}?src=share`,
      },
    };
  }

  private async generateUniqueCode(length = 6): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = this.generateCode(length);

      const exists = await this.prisma.shortLink.findUnique({
        where: { code },
        select: { id: true },
      });

      if (!exists) {
        return code;
      }
    }

    throw new Error('Failed to generate unique short link code');
  }

  private generateCode(length: number): string {
    const alphabet =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const bytes = randomBytes(length);
    let out = '';

    for (let i = 0; i < length; i++) {
      out += alphabet[bytes[i] % alphabet.length];
    }

    return out;
  }
}

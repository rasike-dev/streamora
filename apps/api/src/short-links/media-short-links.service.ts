import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class MediaShortLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserByExternalId(externalId: string) {
    return this.prisma.user.findUnique({
      where: { externalId },
      include: { roles: true },
    });
  }

  async createOrGetShortLink(mediaItemId: string, actorUserId: string) {
    const item = await this.prisma.mediaItem.findUnique({
      where: { id: mediaItemId },
      select: { id: true, slug: true, uploaderId: true },
    });
    if (!item) throw new NotFoundException('Media item not found');

    const user = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      include: { roles: true },
    });

    const isAdmin = user?.roles.some((r) => r.role === 'ADMIN');
    const isOwner = item.uploaderId === actorUserId;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        'You cannot create a share link for this media item',
      );
    }

    const existing = await this.prisma.mediaShortLink.findFirst({
      where: { mediaItemId: item.id },
      select: { code: true },
    });

    const code = existing?.code ?? (await this.generateUniqueCode());
    if (!existing) {
      await this.prisma.mediaShortLink.create({
        data: {
          code,
          mediaItemId: item.id,
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
      shortUrl: `${appBaseUrl}/m/${code}`,
      targetUrl: `/en/m/${item.slug}?src=share`,
    };
  }

  async resolveShortLink(code: string, locale: string) {
    const shortLink = await this.prisma.mediaShortLink.findUnique({
      where: { code },
      select: {
        code: true,
        mediaItem: {
          select: { id: true, slug: true, status: true, visibility: true },
        },
      },
    });

    if (!shortLink?.mediaItem) {
      throw new NotFoundException('Short link not found');
    }

    const isPubliclyResolvable =
      shortLink.mediaItem.status === 'PUBLISHED' &&
      (shortLink.mediaItem.visibility === 'PUBLIC' ||
        shortLink.mediaItem.visibility === 'UNLISTED');

    if (!isPubliclyResolvable) {
      throw new NotFoundException('Short link not found');
    }

    return {
      code: shortLink.code,
      target: {
        mediaItemId: shortLink.mediaItem.id,
        slug: shortLink.mediaItem.slug,
        locale,
        redirectUrl: `/${locale}/m/${shortLink.mediaItem.slug}?src=share`,
      },
    };
  }

  private async generateUniqueCode(length = 6): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = this.generateCode(length);
      const exists = await this.prisma.mediaShortLink.findUnique({
        where: { code },
        select: { id: true },
      });
      if (!exists) return code;
    }
    throw new Error('Failed to generate unique media short link code');
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

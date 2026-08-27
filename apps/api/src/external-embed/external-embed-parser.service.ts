import { BadRequestException, Injectable } from '@nestjs/common';
import { ExternalEmbedProvider } from '@prisma/client';

export type ParsedExternalEmbed = {
  provider: ExternalEmbedProvider;
  canonicalUrl: string;
  embedUrl: string;
  embedWidth?: number;
  embedHeight?: number;
};

const ALLOWED_EMBED_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
  'www.facebook.com',
  'facebook.com',
  'web.facebook.com',
  'm.facebook.com',
  'player.vimeo.com',
  'vimeo.com',
]);

@Injectable()
export class ExternalEmbedParserService {
  parseInput(input: string): ParsedExternalEmbed {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new BadRequestException('Paste a video URL or embed code');
    }

    if (trimmed.includes('<iframe')) {
      const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
      if (!srcMatch?.[1]) {
        throw new BadRequestException('Could not find iframe src in embed code');
      }
      const src = srcMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      return this.parseEmbedUrl(src);
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return this.parsePageOrEmbedUrl(trimmed);
    }

    throw new BadRequestException(
      'Unsupported input. Paste a YouTube, Facebook, or Vimeo URL or iframe embed code.',
    );
  }

  private parsePageOrEmbedUrl(rawUrl: string): ParsedExternalEmbed {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();

    if (host.includes('youtu.be')) {
      const id = url.pathname.replace(/^\//, '').split('/')[0];
      if (!id) throw new BadRequestException('Invalid YouTube short URL');
      return this.buildYouTube(id);
    }

    if (host.includes('youtube.com')) {
      if (url.pathname.startsWith('/embed/')) {
        const id = url.pathname.split('/')[2];
        if (!id) throw new BadRequestException('Invalid YouTube embed URL');
        return this.buildYouTube(id);
      }
      const id = url.searchParams.get('v');
      if (!id) throw new BadRequestException('Invalid YouTube watch URL');
      return this.buildYouTube(id);
    }

    if (host.includes('facebook.com') || host === 'fb.watch') {
      return this.buildFacebook(rawUrl);
    }

    if (host.includes('vimeo.com')) {
      if (host === 'player.vimeo.com') {
        const id = url.pathname.split('/').filter(Boolean).pop();
        if (!id) throw new BadRequestException('Invalid Vimeo player URL');
        return this.buildVimeo(id, rawUrl);
      }
      const match = url.pathname.match(/\/(\d+)/);
      if (!match?.[1]) throw new BadRequestException('Invalid Vimeo URL');
      return this.buildVimeo(match[1], rawUrl);
    }

    throw new BadRequestException(
      'Unsupported provider. Use YouTube, Facebook, or Vimeo links.',
    );
  }

  private parseEmbedUrl(rawUrl: string): ParsedExternalEmbed {
    const url = new URL(rawUrl);
    if (!ALLOWED_EMBED_HOSTS.has(url.hostname.toLowerCase())) {
      throw new BadRequestException('Embed host is not allowed');
    }

    if (url.hostname.includes('youtube')) {
      const id =
        url.pathname.startsWith('/embed/')
          ? url.pathname.split('/')[2]
          : url.searchParams.get('v');
      if (!id) throw new BadRequestException('Invalid YouTube embed URL');
      return this.buildYouTube(id);
    }

    if (url.hostname.includes('facebook.com')) {
      const href = url.searchParams.get('href');
      if (href) return this.buildFacebook(decodeURIComponent(href));
      return this.buildFacebook(rawUrl);
    }

    if (url.hostname.includes('vimeo.com')) {
      const id = url.pathname.split('/').filter(Boolean).pop();
      if (!id) throw new BadRequestException('Invalid Vimeo embed URL');
      return this.buildVimeo(id, rawUrl);
    }

    throw new BadRequestException('Unsupported embed URL');
  }

  private buildYouTube(id: string): ParsedExternalEmbed {
    const canonicalUrl = `https://www.youtube.com/watch?v=${id}`;
    const embedUrl = `https://www.youtube-nocookie.com/embed/${id}`;
    this.assertAllowedEmbedUrl(embedUrl);
    return {
      provider: 'YOUTUBE',
      canonicalUrl,
      embedUrl,
      embedWidth: 560,
      embedHeight: 315,
    };
  }

  private buildFacebook(pageUrl: string): ParsedExternalEmbed {
    const canonicalUrl = pageUrl.split('?')[0];
    const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
      pageUrl,
    )}&show_text=false&width=560`;
    this.assertAllowedEmbedUrl(embedUrl);
    return {
      provider: 'FACEBOOK',
      canonicalUrl,
      embedUrl,
      embedWidth: 560,
      embedHeight: 315,
    };
  }

  private buildVimeo(id: string, canonicalUrl: string): ParsedExternalEmbed {
    const embedUrl = `https://player.vimeo.com/video/${id}`;
    this.assertAllowedEmbedUrl(embedUrl);
    return {
      provider: 'VIMEO',
      canonicalUrl,
      embedUrl,
      embedWidth: 560,
      embedHeight: 315,
    };
  }

  private assertAllowedEmbedUrl(embedUrl: string) {
    const host = new URL(embedUrl).hostname.toLowerCase();
    if (!ALLOWED_EMBED_HOSTS.has(host)) {
      throw new BadRequestException(`Embed host not allowed: ${host}`);
    }
  }
}

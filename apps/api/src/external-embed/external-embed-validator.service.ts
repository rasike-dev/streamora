import { Injectable, Logger } from '@nestjs/common';
import { ExternalEmbedProvider } from '@prisma/client';
import type { ParsedExternalEmbed } from './external-embed-parser.service';

export type ExternalEmbedValidationResult = {
  status: 'ACTIVE' | 'UNAVAILABLE' | 'ERROR';
  thumbnailUrl?: string | null;
  error?: string | null;
};

@Injectable()
export class ExternalEmbedValidatorService {
  private readonly logger = new Logger(ExternalEmbedValidatorService.name);
  private readonly timeoutMs = 12_000;

  async validate(parsed: ParsedExternalEmbed): Promise<ExternalEmbedValidationResult> {
    try {
      switch (parsed.provider) {
        case 'YOUTUBE':
          return await this.validateOEmbed(
            'YOUTUBE',
            `https://www.youtube.com/oembed?url=${encodeURIComponent(parsed.canonicalUrl)}&format=json`,
          );
        case 'VIMEO':
          return await this.validateOEmbed(
            'VIMEO',
            `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(parsed.canonicalUrl)}`,
          );
        case 'FACEBOOK':
          return await this.validateFacebook(parsed);
        default:
          return await this.validateGeneric(parsed.embedUrl);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Validation failed';
      this.logger.warn(`External embed validation error (${parsed.provider}): ${message}`);
      return { status: 'ERROR', error: message };
    }
  }

  private async validateOEmbed(
    provider: ExternalEmbedProvider,
    oembedUrl: string,
  ): Promise<ExternalEmbedValidationResult> {
    const res = await this.fetchWithTimeout(oembedUrl, {
      headers: { Accept: 'application/json' },
    });

    if (res.status === 404 || res.status === 401 || res.status === 403) {
      return {
        status: 'UNAVAILABLE',
        error: `${provider} reported the video is unavailable (${res.status})`,
      };
    }

    if (!res.ok) {
      return {
        status: 'ERROR',
        error: `${provider} oEmbed check failed (${res.status})`,
      };
    }

    const data = (await res.json()) as { thumbnail_url?: string };
    return {
      status: 'ACTIVE',
      thumbnailUrl: data.thumbnail_url ?? null,
    };
  }

  private async validateFacebook(
    parsed: ParsedExternalEmbed,
  ): Promise<ExternalEmbedValidationResult> {
    const oembedUrl = `https://www.facebook.com/plugins/video/oembed.json/?url=${encodeURIComponent(
      parsed.canonicalUrl,
    )}`;
    const oembedResult = await this.validateOEmbed('FACEBOOK', oembedUrl);
    if (oembedResult.status === 'ACTIVE') {
      return oembedResult;
    }

    const pluginRes = await this.fetchWithTimeout(parsed.embedUrl, { method: 'GET' });
    if (pluginRes.ok) {
      return { status: 'ACTIVE' };
    }
    if ([404, 410, 451].includes(pluginRes.status)) {
      return {
        status: 'UNAVAILABLE',
        error: `Facebook embed unavailable (${pluginRes.status})`,
      };
    }

    return oembedResult.status === 'UNAVAILABLE'
      ? oembedResult
      : {
          status: 'ERROR',
          error: oembedResult.error ?? `Facebook embed check failed (${pluginRes.status})`,
        };
  }

  private async validateGeneric(embedUrl: string): Promise<ExternalEmbedValidationResult> {
    const res = await this.fetchWithTimeout(embedUrl, { method: 'HEAD' });
    if (res.ok) return { status: 'ACTIVE' };
    if ([404, 410, 451].includes(res.status)) {
      return { status: 'UNAVAILABLE', error: `Embed unavailable (${res.status})` };
    }
    return { status: 'ERROR', error: `Embed check failed (${res.status})` };
  }

  private fetchWithTimeout(url: string, init?: RequestInit) {
    return fetch(url, {
      ...init,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normalize search query: trim, collapse whitespace, limit length
   */
  normalizeQuery(q?: string): string {
    if (!q) return '';
    return q.trim().replace(/\s+/g, ' ').slice(0, 100);
  }

  /**
   * Channel / subcategory / category / tag restrictions as EXISTS clauses.
   *
   * EXISTS rather than INNER JOIN because a video can sit in several channels of
   * the same category; joining would emit one row per match and inflate both the
   * result list and the count.
   */
  private buildTaxonomyFilters(
    params: {
      category?: string;
      subcategory?: string;
      channel?: string;
      tag?: string;
    },
    bind: (value: string) => string,
  ): string {
    const clauses: string[] = [];

    if (params.channel || params.subcategory || params.category) {
      const conditions = ['c_f."isActive" = true'];
      let joins = '';

      if (params.channel) {
        conditions.push(`c_f.slug = ${bind(params.channel)}`);
      }

      if (params.subcategory || params.category) {
        joins += ` INNER JOIN "Subcategory" s_f ON s_f.id = c_f."subcategoryId"`;
        conditions.push('s_f."isActive" = true');

        if (params.subcategory) {
          conditions.push(`s_f.slug = ${bind(params.subcategory)}`);
        }

        if (params.category) {
          joins += ` INNER JOIN "Category" cat_f ON cat_f.id = s_f."categoryId"`;
          conditions.push('cat_f."isActive" = true');
          conditions.push(`cat_f.slug = ${bind(params.category)}`);
        }
      }

      clauses.push(`
        AND EXISTS (
          SELECT 1
          FROM "VideoChannel" vc_f
          INNER JOIN "Channel" c_f ON c_f.id = vc_f."channelId"
          ${joins}
          WHERE vc_f."videoId" = v.id
            AND ${conditions.join(' AND ')}
        )`);
    }

    if (params.tag) {
      clauses.push(`
        AND EXISTS (
          SELECT 1
          FROM "VideoTag" vt_f
          INNER JOIN "Tag" t_f ON t_f.id = vt_f."tagId"
          WHERE vt_f."videoId" = v.id
            AND t_f.slug = ${bind(params.tag)}
        )`);
    }

    return clauses.join('\n');
  }

  /**
   * Search public videos with full-text ranking and trigram similarity
   */
  async searchPublicVideos(params: {
    locale: string;
    q?: string;
    category?: string;
    subcategory?: string;
    channel?: string;
    tag?: string;
    page: number;
    pageSize: number;
  }) {
    const normalizedQuery = this.normalizeQuery(params.q);
    const locale = params.locale || 'en';
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize || 12));
    const skip = (page - 1) * pageSize;

    // If no query, use normal listing path
    if (!normalizedQuery || normalizedQuery.length < 2) {
      return this.listPublicVideosWithoutSearch(params);
    }

    // $1 locale and $2 query are fixed; every taxonomy filter appends its own
    // parameter and reads back its position, so adding a filter never requires
    // renumbering the ones after it. LIMIT/OFFSET are appended last and only for
    // the paged query, which is why the count query can reuse this same array.
    const filterParams: any[] = [locale, normalizedQuery];
    const bind = (value: string) => `$${filterParams.push(value)}`;
    const filterClauses = this.buildTaxonomyFilters(params, bind);

    // Build search query with ranking - use Prisma.Sql for safety
    const searchQuery = `
      WITH localized_video AS (
        SELECT
          v.id,
          v.slug,
          v."publishedAt",
          v."uploaderId",
          v."uploaderVisible",
          COALESCE(vt_req.title, vt_en.title, 'Untitled') AS title,
          COALESCE(vt_req.description, vt_en.description, '') AS description,
          COALESCE(vt_req.tagline, vt_en.tagline, '') AS tagline
        FROM "Video" v
        LEFT JOIN "VideoTranslation" vt_req
          ON vt_req."videoId" = v.id AND vt_req.locale = $1
        LEFT JOIN "VideoTranslation" vt_en
          ON vt_en."videoId" = v.id AND vt_en.locale = 'en'
        WHERE v.status = 'PUBLISHED'
          AND v.visibility = 'PUBLIC'
          ${filterClauses}
      )
      SELECT
        lv.id,
        (
          COALESCE(
            ts_rank(
              setweight(to_tsvector('simple', COALESCE(lv.title, '')), 'A') ||
              setweight(to_tsvector('simple', COALESCE(lv.tagline, '')), 'B') ||
              setweight(to_tsvector('simple', COALESCE(lv.description, '')), 'C'),
              websearch_to_tsquery('simple', $2)
            ),
            0
          ) * 0.8
          +
          COALESCE(similarity(COALESCE(lv.title, ''), $2), 0) * 0.2
        ) AS score
      FROM localized_video lv
      WHERE
        (
          setweight(to_tsvector('simple', COALESCE(lv.title, '')), 'A') ||
          setweight(to_tsvector('simple', COALESCE(lv.tagline, '')), 'B') ||
          setweight(to_tsvector('simple', COALESCE(lv.description, '')), 'C')
        ) @@ websearch_to_tsquery('simple', $2)
        OR similarity(COALESCE(lv.title, ''), $2) > 0.12
      ORDER BY score DESC, lv."publishedAt" DESC
      LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}
    `;

    const searchResults = await this.prisma.$queryRawUnsafe<
      Array<{ id: string; score: number }>
    >(searchQuery, ...filterParams, pageSize, skip);

    const videoIds = searchResults.map((r) => r.id);

    if (videoIds.length === 0) {
      return {
        items: [],
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
        searchMeta: {
          query: normalizedQuery,
          mode: 'ranked' as const,
        },
      };
    }

    // Get total count
    const totalQuery = `
      WITH localized_video AS (
        SELECT
          v.id,
          COALESCE(vt_req.title, vt_en.title, 'Untitled') AS title,
          COALESCE(vt_req.description, vt_en.description, '') AS description,
          COALESCE(vt_req.tagline, vt_en.tagline, '') AS tagline
        FROM "Video" v
        LEFT JOIN "VideoTranslation" vt_req
          ON vt_req."videoId" = v.id AND vt_req.locale = $1
        LEFT JOIN "VideoTranslation" vt_en
          ON vt_en."videoId" = v.id AND vt_en.locale = 'en'
        WHERE v.status = 'PUBLISHED'
          AND v.visibility = 'PUBLIC'
          ${filterClauses}
      )
      SELECT COUNT(*)::int AS count
      FROM localized_video lv
      WHERE
        (
          setweight(to_tsvector('simple', COALESCE(lv.title, '')), 'A') ||
          setweight(to_tsvector('simple', COALESCE(lv.tagline, '')), 'B') ||
          setweight(to_tsvector('simple', COALESCE(lv.description, '')), 'C')
        ) @@ websearch_to_tsquery('simple', $2)
        OR similarity(COALESCE(lv.title, ''), $2) > 0.12
    `;

    const totalResult = await this.prisma.$queryRawUnsafe<
      Array<{ count: number }>
    >(totalQuery, ...filterParams);
    const total = totalResult[0]?.count || 0;

    // Hydrate video data
    const videos = await this.prisma.video.findMany({
      where: {
        id: { in: videoIds },
      },
      include: {
        translations: {
          where: {
            locale: { in: [locale, 'en'] },
          },
        },
        thumbnails: {
          where: { isSelected: true },
          take: 1,
        },
        uploader: true,
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    // Preserve search order
    const orderedVideos = videoIds
      .map((id) => videos.find((v) => v.id === id))
      .filter((v): v is NonNullable<typeof v> => v !== undefined);

    return {
      items: orderedVideos.map((video) => {
        const translation =
          video.translations.find((t) => t.locale === locale) ??
          video.translations.find((t) => t.locale === 'en');

        const thumb = video.thumbnails[0];

        let uploader: string | null = null;
        if (video.uploaderVisible && video.uploaderId) {
          // Note: creator profile check would go here if needed
          uploader =
            video.uploader?.displayName || video.uploader?.username || null;
        }

        return {
          id: video.id,
          slug: video.slug,
          title: translation?.title ?? 'Untitled',
          tagline: translation?.tagline ?? null,
          description: translation?.description ?? null,
          thumbnailUrl: thumb
            ? (() => {
                const cdnBase =
                  process.env.CDN_BASE_URL || process.env.PUBLIC_ASSET_BASE_URL;
                return cdnBase
                  ? `${cdnBase}/${thumb.objectKey}`
                  : `https://storage.googleapis.com/${thumb.bucket}/${thumb.objectKey}`;
              })()
            : null,
          uploader,
          publishedAt: video.publishedAt,
        };
      }),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      searchMeta: {
        query: normalizedQuery,
        mode: 'ranked' as const,
      },
    };
  }

  /**
   * Fallback to normal listing when no search query
   * This delegates to existing PublicVideosService logic
   */
  private async listPublicVideosWithoutSearch(params: {
    locale: string;
    category?: string;
    subcategory?: string;
    channel?: string;
    tag?: string;
    page: number;
    pageSize: number;
  }) {
    void params;
    // Return structure indicating listing mode
    // Actual implementation will be handled by PublicVideosService
    return null;
  }

  /**
   * Search creator videos with full-text ranking
   */
  async searchCreatorVideos(params: {
    userId: string;
    locale: string;
    q?: string;
    status?: string;
    visibility?: string;
    page: number;
    pageSize: number;
  }) {
    const normalizedQuery = this.normalizeQuery(params.q);
    const locale = params.locale || 'en';
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(50, Math.max(1, params.pageSize || 12));
    const skip = (page - 1) * pageSize;

    // If no query, use normal listing path
    if (!normalizedQuery || normalizedQuery.length < 2) {
      return this.listCreatorVideosWithoutSearch(params);
    }

    // Build status filter
    let statusFilter = '';
    if (params.status) {
      statusFilter = `AND v.status = '${params.status}'`;
    }

    // Build visibility filter
    let visibilityFilter = '';
    if (params.visibility) {
      visibilityFilter = `AND v.visibility = '${params.visibility}'`;
    }

    const searchQuery = `
      WITH localized_video AS (
        SELECT
          v.id,
          v."updatedAt",
          COALESCE(vt_req.title, vt_en.title, 'Untitled') AS title,
          COALESCE(vt_req.description, vt_en.description, '') AS description,
          COALESCE(vt_req.tagline, vt_en.tagline, '') AS tagline
        FROM "Video" v
        LEFT JOIN "VideoTranslation" vt_req
          ON vt_req."videoId" = v.id AND vt_req.locale = $1
        LEFT JOIN "VideoTranslation" vt_en
          ON vt_en."videoId" = v.id AND vt_en.locale = 'en'
        WHERE v."uploaderId" = $2
          ${statusFilter}
          ${visibilityFilter}
      )
      SELECT
        lv.id,
        (
          COALESCE(
            ts_rank(
              setweight(to_tsvector('simple', COALESCE(lv.title, '')), 'A') ||
              setweight(to_tsvector('simple', COALESCE(lv.tagline, '')), 'B') ||
              setweight(to_tsvector('simple', COALESCE(lv.description, '')), 'C'),
              websearch_to_tsquery('simple', $3)
            ),
            0
          ) * 0.8
          +
          COALESCE(similarity(COALESCE(lv.title, ''), $3), 0) * 0.2
        ) AS score
      FROM localized_video lv
      WHERE
        (
          setweight(to_tsvector('simple', COALESCE(lv.title, '')), 'A') ||
          setweight(to_tsvector('simple', COALESCE(lv.tagline, '')), 'B') ||
          setweight(to_tsvector('simple', COALESCE(lv.description, '')), 'C')
        ) @@ websearch_to_tsquery('simple', $3)
        OR similarity(COALESCE(lv.title, ''), $3) > 0.12
      ORDER BY score DESC, lv."updatedAt" DESC
      LIMIT $4 OFFSET $5
    `;

    const searchResults = await this.prisma.$queryRawUnsafe<
      Array<{ id: string; score: number }>
    >(searchQuery, locale, params.userId, normalizedQuery, pageSize, skip);

    const videoIds = searchResults.map((r) => r.id);

    if (videoIds.length === 0) {
      return {
        items: [],
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
        },
        searchMeta: {
          query: normalizedQuery,
          mode: 'ranked' as const,
        },
      };
    }

    // Get total count
    const totalQuery = `
      WITH localized_video AS (
        SELECT
          v.id,
          COALESCE(vt_req.title, vt_en.title, 'Untitled') AS title,
          COALESCE(vt_req.description, vt_en.description, '') AS description,
          COALESCE(vt_req.tagline, vt_en.tagline, '') AS tagline
        FROM "Video" v
        LEFT JOIN "VideoTranslation" vt_req
          ON vt_req."videoId" = v.id AND vt_req.locale = $1
        LEFT JOIN "VideoTranslation" vt_en
          ON vt_en."videoId" = v.id AND vt_en.locale = 'en'
        WHERE v."uploaderId" = $2
          ${statusFilter}
          ${visibilityFilter}
      )
      SELECT COUNT(*)::int AS count
      FROM localized_video lv
      WHERE
        (
          setweight(to_tsvector('simple', COALESCE(lv.title, '')), 'A') ||
          setweight(to_tsvector('simple', COALESCE(lv.tagline, '')), 'B') ||
          setweight(to_tsvector('simple', COALESCE(lv.description, '')), 'C')
        ) @@ websearch_to_tsquery('simple', $3)
        OR similarity(COALESCE(lv.title, ''), $3) > 0.12
    `;

    const totalResult = await this.prisma.$queryRawUnsafe<
      Array<{ count: number }>
    >(totalQuery, locale, params.userId, normalizedQuery);
    const total = totalResult[0]?.count || 0;

    // Hydrate video data
    const videos = await this.prisma.video.findMany({
      where: {
        id: { in: videoIds },
        uploaderId: params.userId,
      },
      include: {
        translations: {
          where: {
            locale: { in: [locale, 'en'] },
          },
        },
        thumbnails: {
          where: { isSelected: true },
          take: 1,
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    // Preserve search order
    const orderedVideos = videoIds
      .map((id) => videos.find((v) => v.id === id))
      .filter((v): v is NonNullable<typeof v> => v !== undefined);

    return {
      items: orderedVideos.map((video) => {
        const translation =
          video.translations.find((t) => t.locale === locale) ??
          video.translations.find((t) => t.locale === 'en');

        const thumb = video.thumbnails[0];

        return {
          id: video.id,
          slug: video.slug,
          status: video.status,
          visibility: video.visibility,
          title: translation?.title ?? 'Untitled',
          tagline: translation?.tagline ?? null,
          thumbnailUrl: thumb
            ? (() => {
                const cdnBase =
                  process.env.CDN_BASE_URL || process.env.PUBLIC_ASSET_BASE_URL;
                return cdnBase
                  ? `${cdnBase}/${thumb.objectKey}`
                  : `https://storage.googleapis.com/${thumb.bucket}/${thumb.objectKey}`;
              })()
            : null,
          scheduledAt: video.scheduledAt,
          publishedAt: video.publishedAt,
          updatedAt: video.updatedAt,
        };
      }),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      searchMeta: {
        query: normalizedQuery,
        mode: 'ranked' as const,
      },
    };
  }

  /**
   * Fallback to normal listing when no search query
   * This delegates to existing CreatorVideosQueryService logic
   */
  private async listCreatorVideosWithoutSearch(params: {
    userId: string;
    locale: string;
    status?: string;
    visibility?: string;
    page: number;
    pageSize: number;
  }) {
    void params;
    // Return null to indicate listing mode
    // Actual implementation will be handled by CreatorVideosQueryService
    return null;
  }
}

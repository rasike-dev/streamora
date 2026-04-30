export type PublicTagPageResponse = {
  tag: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  items: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    tagline: string | null;
    thumbnailUrl: string | null;
    publishedAt: string | null;
    channel: {
      slug: string;
      name: string;
    } | null;
    uploader: {
      displayName: string;
    } | null;
  }>;
};

export async function getPublicTagBySlug(
  slug: string,
  locale: string,
  page: number = 1,
  pageSize: number = 12,
): Promise<PublicTagPageResponse> {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const search = new URLSearchParams({
    locale,
    page: String(page),
    pageSize: String(pageSize),
  });

  const res = await fetch(`${api}/tags/${slug}?${search.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('TAG_NOT_FOUND');
    }
    throw new Error('Failed to load tag page');
  }

  return res.json();
}

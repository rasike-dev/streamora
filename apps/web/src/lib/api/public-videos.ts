export async function getPublicVideos(params: {
  locale: string;
  q?: string;
  category?: string;
  subcategory?: string;
  channel?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const search = new URLSearchParams({
    locale: params.locale,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 12),
  });

  if (params.q) search.set('q', params.q);
  if (params.category) search.set('category', params.category);
  if (params.subcategory) search.set('subcategory', params.subcategory);
  if (params.channel) search.set('channel', params.channel);
  if (params.tag) search.set('tag', params.tag);

  const res = await fetch(`${api}/videos?${search.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to load videos');
  }

  return res.json();
}

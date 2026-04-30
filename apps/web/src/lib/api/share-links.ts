export type CreateShareLinkResponse = {
  code: string;
  shortUrl: string;
  targetUrl: string;
};

export async function createOrGetShareLink(
  videoId: string,
): Promise<CreateShareLinkResponse> {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const token = localStorage.getItem('access_token');

  const res = await fetch(`${api}/videos/${videoId}/share`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error('Failed to create share link');
  }

  return res.json();
}

export type ResolveShortLinkResponse = {
  code: string;
  target: {
    videoId: string;
    slug: string;
    locale: string;
    redirectUrl: string;
  };
};

export async function resolveShortLink(
  code: string,
  locale?: string,
): Promise<ResolveShortLinkResponse> {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const qs = new URLSearchParams();
  if (locale) qs.set('locale', locale);

  const res = await fetch(`${api}/short-links/${code}?${qs.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('SHORT_LINK_NOT_FOUND');
    }
    throw new Error('Failed to resolve short link');
  }

  return res.json();
}

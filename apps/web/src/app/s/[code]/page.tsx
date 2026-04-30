import { notFound, redirect } from 'next/navigation';
import { resolveShortLink } from '@/lib/api/share-links';

type PageProps = {
  params: Promise<{
    code: string;
  }>;
  searchParams: Promise<{
    locale?: string;
  }>;
};

export default async function ShortLinkRedirectPage(props: PageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  try {
    const resolved = await resolveShortLink(params.code, searchParams.locale);
    redirect(resolved.target.redirectUrl);
  } catch (error) {
    if (error instanceof Error && error.message === 'SHORT_LINK_NOT_FOUND') {
      notFound();
    }
    throw error;
  }
}

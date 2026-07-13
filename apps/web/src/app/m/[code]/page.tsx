import { notFound, redirect } from "next/navigation";
import { resolveMediaShortLink } from "@/lib/api/media-share-links";

type PageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ locale?: string }>;
};

export default async function MediaShortLinkRedirectPage(props: PageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  try {
    const resolved = await resolveMediaShortLink(
      params.code,
      searchParams.locale,
    );
    redirect(resolved.target.redirectUrl);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "MEDIA_SHORT_LINK_NOT_FOUND"
    ) {
      notFound();
    }
    throw error;
  }
}

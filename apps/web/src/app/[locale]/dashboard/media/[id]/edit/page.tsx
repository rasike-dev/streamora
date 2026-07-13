import { PageFrame, PageHeading } from "@/components/layout";
import { MediaEditor } from "@/components/media-editor";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function MediaEditPage({ params }: PageProps) {
  const { locale, id } = await params;

  return (
    <PageFrame>
      <PageHeading
        title="Edit media"
        backHref={`/${locale}/dashboard/media`}
        backLabel="My media"
      />
      <MediaEditor mediaItemId={id} locale={locale} />
    </PageFrame>
  );
}

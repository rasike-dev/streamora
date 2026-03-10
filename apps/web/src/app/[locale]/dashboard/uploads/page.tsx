import { BulkUploadManager } from "@/components/uploads/BulkUploadManager";

export default async function UploadsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main className="min-h-dvh p-4">
      <div className="mx-auto max-w-3xl">
        <BulkUploadManager locale={locale} />
      </div>
    </main>
  );
}

import { UploadManager } from "@/components/upload-manager";

export default function UploadPage({ params }: { params: { locale: string } }) {
  return (
    <main className="min-h-dvh p-4">
      <h1 className="text-xl font-semibold mb-4">Upload</h1>
      <UploadManager locale={params.locale} />
    </main>
  );
}

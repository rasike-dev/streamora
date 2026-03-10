import VideoDraftEditor from "@/components/video-draft-editor";
import Link from "next/link";

export default function EditVideoPage({
  params,
}: {
  params: { locale: string; id: string };
}) {
  return (
    <main className="min-h-dvh p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit Video</h1>
        <Link
          href={`/${params.locale}/dashboard`}
          className="text-sm text-blue-600 underline"
        >
          Back to Dashboard
        </Link>
      </div>

      <VideoDraftEditor videoId={params.id} locale={params.locale} />
    </main>
  );
}

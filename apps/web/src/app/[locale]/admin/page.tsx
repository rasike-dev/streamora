"use client";

import {useTranslations} from "next-intl";
import {useParams} from "next/navigation";
import Link from "next/link";

export default function AdminPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = (params.locale as string) || "en";

  return (
    <main className="min-h-dvh p-4 space-y-4">
      <h1 className="text-xl font-semibold mb-2">{t("nav.admin")}</h1>
      
      <div className="space-y-3">
        <Link
          href={`/${locale}/admin/moderation`}
          className="block rounded-xl border p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <div className="text-sm font-medium">Moderation Queue</div>
          <div className="text-xs text-muted-foreground">Review and approve pending videos</div>
        </Link>
        <Link
          href={`/${locale}/admin/jobs`}
          className="block rounded-xl border p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <div className="text-sm font-medium">Failed Jobs</div>
          <div className="text-xs text-muted-foreground">View processing failures and errors</div>
        </Link>
      </div>
    </main>
  );
}

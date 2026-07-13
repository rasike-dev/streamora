"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageFrame, PageHeading } from "@/components/layout";
import { listCreatorMedia } from "@/lib/api/creator-media";

export default function DashboardMediaPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations("mediaPage");
  const tCommon = useTranslations("common");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCreatorMedia({ locale })
      .then((data) => setItems(data.items || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [locale]);

  return (
    <PageFrame>
      <PageHeading
        title={t("myMedia")}
        description={t("description")}
        backHref={`/${locale}/dashboard`}
        backLabel={tCommon("backToDashboard")}
        actions={
          <Link
            href={`/${locale}/upload/media`}
            className="rounded-xl border border-black/15 px-4 py-2 text-sm dark:border-white/15"
          >
            {t("uploadMedia")}
          </Link>
        }
      />

      {loading ? (
        <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 p-4 dark:border-white/10"
            >
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-sm text-muted-foreground">
                  {item.kind} · {item.status} · {item.visibility} · {item.views}{" "}
                  {t("views")} · {item.downloads} {t("downloads")}
                </div>
              </div>
              <Link
                href={`/${locale}/dashboard/media/${item.id}/edit`}
                className="text-sm font-medium underline underline-offset-2"
              >
                {t("edit")}
              </Link>
            </div>
          ))}
        </div>
      )}
    </PageFrame>
  );
}

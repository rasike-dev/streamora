"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PageFrame,
  PageHeading,
  UserBanner,
} from "@/components/layout";
import { getCreatorVideoAnalytics } from "@/lib/api/creator-video-analytics";

const statCard =
  "rounded-2xl border border-black/10 bg-black/[0.02] p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]";
const panel =
  "rounded-2xl border border-black/10 bg-black/[0.02] p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]";
const btnGhost =
  "rounded-xl border border-black/15 px-4 py-2 text-sm hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]";

export default function VideoAnalyticsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const id = params.id as string;
  const days = Number(searchParams.get("days") ?? "30");

  const tShell = useTranslations("dashboardShell");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tNav = useTranslations("nav");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [failKind, setFailKind] = useState<"unauthorized" | "network" | null>(
    null,
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setFailKind(null);
      try {
        const result = await getCreatorVideoAnalytics(id, days);
        setData(result);
      } catch (e: any) {
        if (e?.message === "UNAUTHORIZED") {
          setFailKind("unauthorized");
        } else {
          setFailKind("network");
        }
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, days]);

  if (loading) {
    return (
      <PageFrame>
        <PageHeading title={tShell("videoAnalyticsTitle")} />
        <p className="text-sm text-muted-foreground">
          {tShell("loadingVideoAnalytics")}
        </p>
      </PageFrame>
    );
  }

  if (failKind || !data) {
    return (
      <PageFrame>
        <PageHeading
          title={tShell("videoAnalyticsTitle")}
          backHref={`/${locale}/dashboard/videos`}
          backLabel={tCommon("myVideos")}
        />
        <UserBanner
          variant="error"
          title={
            failKind === "unauthorized"
              ? tErrors("unauthorized")
              : tShell("analyticsLoadError")
          }
          body={tShell("retryHint")}
          primaryAction={
            failKind === "unauthorized"
              ? { href: `/${locale}/login`, label: tNav("login") }
              : {
                  href: `/${locale}/dashboard/videos`,
                  label: tCommon("myVideos"),
                }
          }
          secondaryAction={{
            href: `/${locale}/dashboard`,
            label: tCommon("backToDashboard"),
          }}
        />
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <PageHeading
        title={tShell("videoAnalyticsTitle")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/dashboard/videos/${id}/edit`}
              className={btnGhost}
            >
              {tCommon("editVideo")}
            </Link>
            <Link
              href={`/${locale}/dashboard/videos`}
              className={btnGhost}
            >
              {tCommon("myVideos")}
            </Link>
          </div>
        }
        backHref={`/${locale}/dashboard/videos`}
        backLabel={tCommon("myVideos")}
      />

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className={statCard}>
          <div className="text-sm text-muted-foreground">{tShell("views")}</div>
          <div className="mt-1 text-2xl font-semibold">{data.totals.views}</div>
        </div>

        <div className={statCard}>
          <div className="text-sm text-muted-foreground">
            {tShell("uniqueViewers")}
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {data.totals.uniqueViewers}
          </div>
        </div>

        <div className={statCard}>
          <div className="text-sm text-muted-foreground">
            {tShell("completions")}
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {data.totals.completions}
          </div>
        </div>

        <div className={statCard}>
          <div className="text-sm text-muted-foreground">
            {tShell("completionRate")}
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {data.totals.completionRate}%
          </div>
        </div>
      </section>

      <section className={`mt-6 ${panel}`}>
        <h2 className="text-lg font-semibold">{tShell("sourcesHeading")}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
            {tShell("trafficDirect")}: {data.trafficSources.direct}
          </div>
          <div className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
            {tShell("trafficShare")}: {data.trafficSources.share}
          </div>
          <div className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
            {tShell("trafficChannel")}: {data.trafficSources.channel}
          </div>
          <div className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
            {tShell("trafficTag")}: {data.trafficSources.tag}
          </div>
          <div className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
            {tShell("trafficSearch")}: {data.trafficSources.search}
          </div>
          <div className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
            {tShell("trafficExternal")}: {data.trafficSources.external}
          </div>
          <div className="rounded-xl border border-black/10 p-3 text-sm dark:border-white/10">
            {tShell("trafficUnknown")}: {data.trafficSources.unknown}
          </div>
        </div>
      </section>

      <section className={`mt-6 ${panel}`}>
        <h2 className="text-lg font-semibold">{tShell("dailyViews")}</h2>
        <div className="mt-4 space-y-2">
          {data.series.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {tShell("analyticsEmpty")}
            </p>
          ) : (
            data.series.map((row: any) => (
              <div
                key={row.date}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 p-3 text-sm dark:border-white/10"
              >
                <span>{row.date}</span>
                <span className="text-muted-foreground">
                  {tShell("views")}: {row.views}
                </span>
                <span className="text-muted-foreground">
                  {tShell("completions")}: {row.completions}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </PageFrame>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  PageFrame,
  PageHeading,
  UserBanner,
} from "@/components/layout";
import { DashboardQuickActions } from "@/components/dashboard-quick-actions";
import { apiFetch } from "@/lib/api";
import { getCreatorAnalyticsOverview } from "@/lib/api/creator-analytics";

const card =
  "rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]";
const panel =
  "rounded-2xl border border-black/10 bg-black/[0.02] p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]";
const toggleInactive =
  "px-4 py-2 text-sm transition hover:bg-black/[0.04] dark:hover:bg-white/[0.06]";
const toggleActive =
  "bg-black/[0.06] px-4 py-2 text-sm font-semibold dark:bg-white/[0.08]";

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className={card}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const t = useTranslations("dashboard");
  const tShell = useTranslations("dashboardShell");
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const params = useParams();
  const locale = (params.locale as string) || "en";

  const [days, setDays] = useState<7 | 30>(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [failKind, setFailKind] = useState<"unauthorized" | "network" | null>(
    null,
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      if (isLoaded && !isSignedIn) {
        setFailKind("unauthorized");
      }
      return;
    }

    const load = async () => {
      setLoading(true);
      setFailKind(null);
      try {
        const meRes = await apiFetch("/me");
        if (!meRes.ok) {
          setFailKind(meRes.status === 401 ? "unauthorized" : "network");
          setData(null);
          return;
        }

        const result = await getCreatorAnalyticsOverview(days, locale);
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
  }, [isLoaded, isSignedIn, days, locale]);

  if (!isLoaded || loading) {
    return (
      <PageFrame>
        <PageHeading title={t("title")} />
        <p className="text-sm text-muted-foreground">{tShell("loadingDashboard")}</p>
      </PageFrame>
    );
  }

  if (failKind || !data) {
    return (
      <PageFrame>
        <PageHeading
          title={t("title")}
          backHref={`/${locale}`}
          backLabel={tCommon("backToHome")}
        />
        <div className="space-y-6">
          <DashboardQuickActions
            locale={locale}
            bulkUploads={tShell("bulkUploads")}
            myVideos={t("myVideos")}
            myMedia={t("myMedia")}
            newUpload={tShell("newUpload")}
            uploadMedia={t("uploadMedia")}
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
            failKind === "unauthorized" && !isSignedIn
              ? { href: `/${locale}/sign-in`, label: tNav("login") }
              : { href: `/${locale}/dashboard`, label: tCommon("retry") }
          }
          secondaryAction={{
            href: `/${locale}`,
            label: tCommon("home"),
          }}
        />
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <PageHeading
        title={t("title")}
        description={tShell("overviewSubtitle", { days: data.rangeDays })}
        actions={
          <div className="flex overflow-hidden rounded-xl border border-black/15 dark:border-white/15">
            <button
              type="button"
              className={days === 7 ? toggleActive : toggleInactive}
              onClick={() => setDays(7)}
            >
              {tShell("last7")}
            </button>
            <button
              type="button"
              className={days === 30 ? toggleActive : toggleInactive}
              onClick={() => setDays(30)}
            >
              {tShell("last30")}
            </button>
          </div>
        }
      />

      <div className="mb-6">
        <DashboardQuickActions
          locale={locale}
          bulkUploads={tShell("bulkUploads")}
          myVideos={t("myVideos")}
          myMedia={t("myMedia")}
          newUpload={tShell("newUpload")}
          uploadMedia={t("uploadMedia")}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label={tShell("views")} value={data.totals.views} />
        <StatCard
          label={tShell("uniqueViewers")}
          value={data.totals.uniqueViewers}
        />
        <StatCard label={tShell("playStarts")} value={data.totals.playStarts} />
        <StatCard label={tShell("completions")} value={data.totals.completions} />
        <StatCard
          label={tShell("completionRate")}
          value={`${data.totals.completionRate}%`}
        />
      </div>

      <section className={`mt-6 ${panel}`}>
        <h2 className="mb-3 text-lg font-semibold">{tShell("trafficSources")}</h2>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div>
            {tShell("trafficDirect")}: {data.trafficSources.directViews}
          </div>
          <div>
            {tShell("trafficShare")}: {data.trafficSources.shareViews}
          </div>
          <div>
            {tShell("trafficChannel")}: {data.trafficSources.channelViews}
          </div>
          <div>
            {tShell("trafficTag")}: {data.trafficSources.tagViews}
          </div>
          <div>
            {tShell("trafficSearch")}: {data.trafficSources.searchViews}
          </div>
          <div>
            {tShell("trafficExternal")}: {data.trafficSources.externalViews}
          </div>
          <div>
            {tShell("trafficUnknown")}: {data.trafficSources.unknownViews}
          </div>
        </div>
      </section>

      <section className={`mt-6 ${panel}`}>
        <h2 className="mb-3 text-lg font-semibold">{tShell("dailyTrend")}</h2>
        {data.dailyTrend.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tShell("noDailyData")}</p>
        ) : (
          <div className="space-y-2 text-sm">
            {data.dailyTrend.map((row: any) => (
              <div
                key={row.date}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-black/10 pb-2 dark:border-white/10"
              >
                <span>{row.date}</span>
                <span className="text-muted-foreground">
                  {tShell("views")} {row.views} · {tShell("playStarts")}{" "}
                  {row.playStarts} · {tShell("completions")} {row.completions}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={`mt-6 ${panel}`}>
        <h2 className="mb-3 text-lg font-semibold">{tShell("topVideos")}</h2>
        {data.topVideos.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tShell("noTopVideos")}</p>
        ) : (
          <div className="space-y-3">
            {data.topVideos.map((video: any) => (
              <div
                key={video.videoId}
                className="flex items-center gap-3 rounded-xl border border-black/10 p-3 dark:border-white/10"
              >
                {video.thumbnailUrl ? (
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    width={96}
                    height={56}
                    unoptimized
                    className="h-14 w-24 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-14 w-24 shrink-0 rounded-lg bg-black/5 dark:bg-white/10" />
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{video.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {video.views} · {video.playStarts} · {video.completionRate}%
                  </div>
                </div>
                <Link
                  href={`/${locale}/dashboard/videos/${video.videoId}/analytics`}
                  className="shrink-0 text-sm font-medium text-foreground underline underline-offset-2"
                >
                  {tShell("viewAnalytics")}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageFrame>
  );
}

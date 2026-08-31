"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PageFrame,
  PageHeading,
  UserBanner,
} from "@/components/layout";
import { getCreatorVideos, reprocessCreatorVideo } from "@/lib/api/creator-videos";

const REPROCESSABLE = ["DRAFT", "UPLOADED", "PROCESSING", "PROCESSING_FAILED"];

const surface =
  "rounded-2xl border border-black/10 bg-black/[0.02] p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]";
const rowCard =
  "flex gap-4 rounded-2xl border border-black/10 bg-black/[0.02] p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]";
const thumbBg = "h-24 w-40 shrink-0 overflow-hidden rounded-xl bg-black/5 dark:bg-white/10";
const btnPrimary =
  "rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90";
const btnGhost =
  "rounded-xl border border-black/15 px-4 py-2 text-sm hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]";
const btnMuted =
  "rounded-xl border border-black/15 px-4 py-2 text-sm text-muted-foreground dark:border-white/15";

export default function CreatorVideosPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";

  const t = useTranslations("dashboardVideos");
  const tVideos = useTranslations("videosPage");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tNav = useTranslations("nav");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [failKind, setFailKind] = useState<"unauthorized" | "network" | null>(
    null,
  );
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const startProcessing = async (videoId: string) => {
    setReprocessingId(videoId);
    setNotice(null);
    try {
      await reprocessCreatorVideo(videoId);
      setNotice(
        "Processing queued. The worker will transcode this video to READY — refresh in a minute.",
      );
      setData((prev: any) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((v: any) =>
                v.id === videoId ? { ...v, status: "UPLOADED" } : v,
              ),
            }
          : prev,
      );
    } catch (e: any) {
      setNotice(`Could not start processing: ${e.message}`);
    } finally {
      setReprocessingId(null);
    }
  };

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const visibility = searchParams.get("visibility") ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setFailKind(null);
      try {
        const result = await getCreatorVideos({
          locale,
          q: q || undefined,
          status: status || undefined,
          visibility: visibility || undefined,
          page,
          pageSize: 12,
        });
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
  }, [locale, q, status, visibility, page]);

  if (loading) {
    return (
      <PageFrame>
        <PageHeading title={t("title")} />
        <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
      </PageFrame>
    );
  }

  if (failKind || !data) {
    return (
      <PageFrame>
        <PageHeading
          title={t("title")}
          backHref={`/${locale}/dashboard`}
          backLabel={tCommon("backToDashboard")}
        />
        <UserBanner
          variant="error"
          title={
            failKind === "unauthorized"
              ? tErrors("unauthorized")
              : t("loadError")
          }
          body={tErrors("network")}
          primaryAction={
            failKind === "unauthorized"
              ? { href: `/${locale}/login`, label: tNav("login") }
              : { href: `/${locale}/dashboard/videos`, label: tCommon("retry") }
          }
          secondaryAction={{
            href: `/${locale}/dashboard`,
            label: tCommon("backToDashboard"),
          }}
        />
      </PageFrame>
    );
  }

  const filtered = Boolean(q || status || visibility);

  return (
    <PageFrame>
      <PageHeading
        title={t("title")}
        description={t("description")}
        backHref={`/${locale}/dashboard`}
        backLabel={tCommon("backToDashboard")}
      />

      <form
        method="get"
        action={`/${locale}/dashboard/videos`}
        className={`${surface} mt-2 space-y-4`}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <input
            name="q"
            defaultValue={q}
            placeholder={t("searchPlaceholder")}
            className="rounded-xl border border-black/15 bg-background px-3 py-2 text-sm md:col-span-2 dark:border-white/15"
          />

          <select
            name="status"
            defaultValue={status}
            className="rounded-xl border border-black/15 bg-background px-3 py-2 text-sm dark:border-white/15"
          >
            <option value="">{t("allStatuses")}</option>
            <option value="DRAFT">DRAFT</option>
            <option value="READY">READY</option>
            <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="REJECTED">REJECTED</option>
          </select>

          <select
            name="visibility"
            defaultValue={visibility}
            className="rounded-xl border border-black/15 bg-background px-3 py-2 text-sm dark:border-white/15"
          >
            <option value="">{t("allVisibility")}</option>
            <option value="PUBLIC">PUBLIC</option>
            <option value="UNLISTED">UNLISTED</option>
            <option value="PRIVATE">PRIVATE</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className={btnPrimary}>
            {tVideos("search")}
          </button>
          <Link href={`/${locale}/dashboard/videos`} className={btnGhost}>
            {tVideos("clear")}
          </Link>
        </div>
      </form>

      {notice ? (
        <div className="sticky top-2 z-10 mt-4 rounded-xl border border-black/10 bg-background/95 px-4 py-3 text-sm shadow-sm backdrop-blur dark:border-white/15">
          {notice}
        </div>
      ) : null}

      <section className="mt-8 space-y-3">
        {data.items.length === 0 ? (
          <div className={`${surface} text-sm text-muted-foreground`}>
            {filtered ? t("emptyFiltered") : t("empty")}
          </div>
        ) : (
          data.items.map((video: any) => (
            <div key={video.id} className={rowCard}>
              <div className={thumbBg}>
                {video.thumbnailUrl ? (
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    width={160}
                    height={96}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold">{video.title}</h2>
                {video.tagline ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {video.tagline}
                  </p>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-black/10 px-2 py-0.5 dark:border-white/15">
                    {video.status}
                  </span>
                  <span className="rounded-full border border-black/10 px-2 py-0.5 dark:border-white/15">
                    {video.visibility}
                  </span>
                  {video.scheduledAt ? (
                    <span className="rounded-full border border-black/10 px-2 py-0.5 dark:border-white/15">
                      {t("scheduledBadge")}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/${locale}/dashboard/videos/${video.id}/edit`}
                    className={btnGhost}
                  >
                    {tCommon("editVideo")}
                  </Link>

                  <Link
                    href={`/${locale}/dashboard/videos/${video.id}/thumbnails`}
                    className={btnGhost}
                  >
                    {tCommon("thumbnails")}
                  </Link>
                  <Link
                    href={`/${locale}/dashboard/videos/${video.id}/analytics`}
                    className={btnGhost}
                  >
                    {tCommon("analytics")}
                  </Link>

                  {REPROCESSABLE.includes(video.status) ? (
                    <button
                      type="button"
                      onClick={() => startProcessing(video.id)}
                      disabled={reprocessingId === video.id}
                      className={btnPrimary}
                    >
                      {reprocessingId === video.id
                        ? "Starting…"
                        : "Start processing"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {data.pagination.totalPages > 1 && (
        <section className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {tVideos("pageOf", {
              page: data.pagination.page,
              total: data.pagination.totalPages,
            })}
          </div>

          <div className="flex gap-2">
            {data.pagination.page > 1 ? (
              <Link
                href={`/${locale}/dashboard/videos?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(status ? { status } : {}),
                  ...(visibility ? { visibility } : {}),
                  page: String(data.pagination.page - 1),
                }).toString()}`}
                className={btnGhost}
              >
                {tVideos("previous")}
              </Link>
            ) : (
              <span className={btnMuted}>{tVideos("previous")}</span>
            )}

            {data.pagination.page < data.pagination.totalPages ? (
              <Link
                href={`/${locale}/dashboard/videos?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(status ? { status } : {}),
                  ...(visibility ? { visibility } : {}),
                  page: String(data.pagination.page + 1),
                }).toString()}`}
                className={btnGhost}
              >
                {tVideos("next")}
              </Link>
            ) : (
              <span className={btnMuted}>{tVideos("next")}</span>
            )}
          </div>
        </section>
      )}
    </PageFrame>
  );
}

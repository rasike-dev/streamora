"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { PageFrame, PageHeading, UserBanner } from "@/components/layout";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth/tokens";

type PendingVideo = {
  id: string;
  title: string | null;
  uploaderName: string | null;
  createdAt: string;
  moderationVersion?: number;
};

export default function AdminPage() {
  const tAdmin = useTranslations("adminHub");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tNav = useTranslations("nav");
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const [access, setAccess] = useState<
    "loading" | "allowed" | "unauthorized" | "forbidden" | "network"
  >("loading");
  const [pending, setPending] = useState<PendingVideo[]>([]);

  useEffect(() => {
    const validateAdminAccess = async () => {
      if (!getAccessToken()) {
        setAccess("unauthorized");
        return;
      }

      try {
        const res = await apiFetch(`/admin/jobs`, {
          cache: "no-store",
        });

        if (res.ok) {
          setAccess("allowed");
          const queueRes = await apiFetch(
            `/admin/moderation/queue?status=PENDING_APPROVAL`,
            { cache: "no-store" },
          );
          if (queueRes.ok) {
            setPending(await queueRes.json());
          }
          return;
        }

        if (res.status === 401) {
          setAccess("unauthorized");
          return;
        }

        if (res.status === 403) {
          setAccess("forbidden");
          return;
        }

        setAccess("network");
      } catch {
        setAccess("network");
      }
    };

    validateAdminAccess();
  }, []);

  const tile =
    "block rounded-xl border border-black/10 bg-black/[0.02] p-4 transition hover:bg-black/[0.04] dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.06]";

  return (
    <PageFrame>
      <PageHeading
        title={tAdmin("title")}
        description={tAdmin("description")}
        backHref={`/${locale}`}
        backLabel={tCommon("backToHome")}
      />

      {access === "loading" ? (
        <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
      ) : access === "unauthorized" ? (
        <UserBanner
          variant="warning"
          title={tErrors("unauthorized")}
          body={tAdmin("needSignIn")}
          primaryAction={{
            href: `/${locale}/login`,
            label: tNav("login"),
          }}
          secondaryAction={{
            href: `/${locale}`,
            label: tCommon("home"),
          }}
        />
      ) : access === "forbidden" ? (
        <UserBanner
          variant="error"
          title={tAdmin("forbidden")}
          primaryAction={{
            href: `/${locale}/dashboard`,
            label: tCommon("dashboard"),
          }}
          secondaryAction={{
            href: `/${locale}`,
            label: tCommon("home"),
          }}
        />
      ) : access === "network" ? (
        <UserBanner
          variant="error"
          title={tErrors("generic")}
          body={tErrors("network")}
          primaryAction={{
            href: `/${locale}/admin`,
            label: tCommon("retry"),
          }}
          secondaryAction={{
            href: `/${locale}`,
            label: tCommon("home"),
          }}
        />
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">{tAdmin("pendingTitle")}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tAdmin("pendingDescription")}
                </p>
              </div>
              <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium dark:border-white/15">
                {tAdmin("pendingCount", { count: pending.length })}
              </span>
            </div>

            {pending.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {tAdmin("pendingEmpty")}
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {pending.slice(0, 5).map((video) => (
                  <li
                    key={video.id}
                    className="rounded-xl border border-black/10 px-3 py-2 text-sm dark:border-white/10"
                  >
                    <div className="font-medium">
                      {video.title ?? tAdmin("untitledVideo")}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {video.uploaderName ?? tAdmin("uploaderHidden")} •{" "}
                      {new Date(video.createdAt).toLocaleString()}
                      {video.moderationVersion && video.moderationVersion > 1
                        ? ` • ${tAdmin("revision", { version: video.moderationVersion })}`
                        : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <Link
              href={`/${locale}/admin/moderation`}
              className="mt-4 inline-flex rounded-xl border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
            >
              {tAdmin("openModeration")}
            </Link>
          </section>

          <div className="space-y-3">
            <Link href={`/${locale}/admin/moderation`} className={tile}>
              <div className="text-sm font-medium">{tAdmin("moderation")}</div>
              <div className="text-xs text-muted-foreground">
                {tAdmin("moderationDescription")}
              </div>
            </Link>
            <Link href={`/${locale}/admin/media-moderation`} className={tile}>
              <div className="text-sm font-medium">Media moderation</div>
              <div className="text-xs text-muted-foreground">
                Review images and documents
              </div>
            </Link>
            <Link href={`/${locale}/admin/taxonomy`} className={tile}>
              <div className="text-sm font-medium">{tAdmin("taxonomy")}</div>
              <div className="text-xs text-muted-foreground">
                {tAdmin("taxonomyDescription")}
              </div>
            </Link>
            <Link href={`/${locale}/admin/tags`} className={tile}>
              <div className="text-sm font-medium">{tAdmin("tags")}</div>
              <div className="text-xs text-muted-foreground">
                {tAdmin("tagsDescription")}
              </div>
            </Link>
            <Link href={`/${locale}/admin/jobs`} className={tile}>
              <div className="text-sm font-medium">{tAdmin("jobs")}</div>
              <div className="text-xs text-muted-foreground">
                {tAdmin("jobsDescription")}
              </div>
            </Link>
          </div>
        </div>
      )}
    </PageFrame>
  );
}

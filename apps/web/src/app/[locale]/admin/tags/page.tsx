"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageFrame, PageHeading, UserBanner } from "@/components/layout";
import { apiFetch, readApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth/tokens";

type AdminTag = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "PENDING" | "BLOCKED" | "MERGED";
  preferred: boolean;
  usageCount: number;
  aliases: string[];
  mergedInto: { id: string; slug: string; name: string } | null;
  createdBy: { id: string; name: string | null } | null;
  createdAt: string;
};

type TagList = {
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  items: AdminTag[];
};

type MergePreview = {
  source: { id: string; name: string; slug: string };
  target: { id: string; name: string; slug: string };
  videosMoved: number;
  mediaItemsMoved: number;
  duplicatesDropped: number;
};

const card =
  "rounded-2xl border border-black/10 bg-black/[0.02] p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]";
const smallButton =
  "rounded-lg border border-black/15 px-2 py-1 text-xs font-medium hover:bg-black/[0.04] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/[0.06]";
const input =
  "rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/15 dark:focus:border-white/40";

const STATUS_STYLES: Record<AdminTag["status"], string> = {
  ACTIVE: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
  PENDING: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  BLOCKED: "border-red-500/40 text-red-600 dark:text-red-400",
  MERGED: "border-black/15 text-muted-foreground dark:border-white/15",
};

export default function AdminTagsPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations("adminTags");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tNav = useTranslations("nav");
  const tAdmin = useTranslations("adminHub");

  const [data, setData] = useState<TagList | null>(null);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mergeSource, setMergeSource] = useState<AdminTag | null>(null);
  const [mergeTargetSlug, setMergeTargetSlug] = useState("");
  const [preview, setPreview] = useState<MergePreview | null>(null);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setErr("UNAUTHORIZED");
      setLoading(false);
      return;
    }

    const search = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (appliedQuery) search.set("q", appliedQuery);
    if (status) search.set("status", status);

    try {
      const res = await apiFetch(`/admin/tags?${search.toString()}`, {
        cache: "no-store",
      });
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      if (res.status === 403) throw new Error("FORBIDDEN");
      if (!res.ok) throw new Error(await readApiError(res));

      setData(await res.json());
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, page, status, t]);

  useEffect(() => {
    load();
  }, [load]);

  const mutate = async (path: string, init: RequestInit) => {
    setBusy(true);
    try {
      const res = await apiFetch(path, init);
      if (!res.ok) {
        setErr(await readApiError(res));
        return false;
      }
      setErr(null);
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  };

  /**
   * Merge is two-step on purpose: the preview shows exactly how many assignments
   * move and how many duplicates disappear before anything is written.
   */
  const runPreview = async () => {
    if (!mergeSource || !mergeTargetSlug.trim()) return;

    const target = data?.items.find(
      (tag) =>
        tag.slug === mergeTargetSlug.trim() ||
        tag.id === mergeTargetSlug.trim(),
    );

    if (!target) {
      setErr(t("mergeSelectTarget"));
      return;
    }

    const res = await apiFetch(
      `/admin/tags/${mergeSource.id}/merge-preview?targetTagId=${target.id}`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      setErr(await readApiError(res));
      return;
    }

    setErr(null);
    setPreview(await res.json());
  };

  const confirmMerge = async () => {
    if (!preview || !mergeSource) return;
    const ok = await mutate(`/admin/tags/${mergeSource.id}/merge`, {
      method: "POST",
      body: JSON.stringify({ targetTagId: preview.target.id }),
    });
    if (ok) {
      setMergeSource(null);
      setMergeTargetSlug("");
      setPreview(null);
    }
  };

  if (loading) {
    return (
      <PageFrame>
        <PageHeading
          title={t("title")}
          description={t("description")}
          backHref={`/${locale}/admin`}
          backLabel={t("backAdmin")}
        />
        <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
      </PageFrame>
    );
  }

  if (err === "UNAUTHORIZED" || err === "FORBIDDEN") {
    return (
      <PageFrame>
        <PageHeading
          title={t("title")}
          backHref={`/${locale}/admin`}
          backLabel={t("backAdmin")}
        />
        <UserBanner
          variant={err === "UNAUTHORIZED" ? "warning" : "error"}
          title={
            err === "UNAUTHORIZED"
              ? tErrors("unauthorized")
              : tAdmin("forbidden")
          }
          body={err === "UNAUTHORIZED" ? tAdmin("needSignIn") : undefined}
          primaryAction={{
            href:
              err === "UNAUTHORIZED" ? `/${locale}/login` : `/${locale}/admin`,
            label: err === "UNAUTHORIZED" ? tNav("login") : t("backAdmin"),
          }}
          secondaryAction={{ href: `/${locale}`, label: tCommon("home") }}
        />
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <PageHeading
        title={t("title")}
        description={t("description")}
        backHref={`/${locale}/admin`}
        backLabel={t("backAdmin")}
      />

      {err ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {err}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className={input}
          value={query}
          placeholder={t("searchPlaceholder")}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              setAppliedQuery(query.trim());
            }
          }}
        />
        <select
          className={input}
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">{t("statusAll")}</option>
          <option value="ACTIVE">{t("statusActive")}</option>
          <option value="PENDING">{t("statusPending")}</option>
          <option value="BLOCKED">{t("statusBlocked")}</option>
          <option value="MERGED">{t("statusMerged")}</option>
        </select>
        <button
          type="button"
          className={smallButton}
          onClick={() => {
            setPage(1);
            setAppliedQuery(query.trim());
          }}
        >
          {t("search")}
        </button>
      </div>

      {mergeSource ? (
        <section className={`${card} mb-4`}>
          <h2 className="text-sm font-semibold">
            {t("mergeInto")}: {mergeSource.name}
          </h2>

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              className={input}
              value={mergeTargetSlug}
              placeholder={t("mergeSelectTarget")}
              onChange={(e) => {
                setMergeTargetSlug(e.target.value);
                setPreview(null);
              }}
            />
            <button
              type="button"
              className={smallButton}
              disabled={busy || !mergeTargetSlug.trim()}
              onClick={runPreview}
            >
              {t("mergePreview")}
            </button>
            <button
              type="button"
              className={smallButton}
              disabled={busy || !preview}
              onClick={confirmMerge}
            >
              {t("mergeConfirm")}
            </button>
            <button
              type="button"
              className={smallButton}
              onClick={() => {
                setMergeSource(null);
                setPreview(null);
                setMergeTargetSlug("");
              }}
            >
              {t("cancel")}
            </button>
          </div>

          {preview ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {preview.source.name} → {preview.target.name}:{" "}
              {t("mergeSummary", {
                videos: preview.videosMoved,
                mediaItems: preview.mediaItemsMoved,
                duplicates: preview.duplicatesDropped,
              })}
            </p>
          ) : null}
        </section>
      ) : null}

      {!data || data.items.length === 0 ? (
        <div className={card}>
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.items.map((tag) => (
            <li key={tag.id} className={card}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{tag.name}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${STATUS_STYLES[tag.status]}`}
                >
                  {tag.status}
                </span>
                {tag.preferred ? (
                  <span className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] uppercase dark:border-white/15">
                    {t("featured")}
                  </span>
                ) : null}
              </div>

              <div className="mt-1 text-xs text-muted-foreground">
                {tag.slug} • {t("usage", { count: tag.usageCount })}
                {tag.createdBy
                  ? ` • ${t("createdBy", {
                      name: tag.createdBy.name ?? t("unknownCreator"),
                    })}`
                  : ""}
                {tag.mergedInto
                  ? ` • ${t("mergedInto", { slug: tag.mergedInto.slug })}`
                  : ""}
              </div>

              {tag.aliases.length ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  {t("aliases")}: {tag.aliases.join(", ")}
                </div>
              ) : null}

              {tag.status !== "MERGED" ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {tag.status === "PENDING" ? (
                    <button
                      type="button"
                      className={smallButton}
                      disabled={busy}
                      onClick={() =>
                        mutate(`/admin/tags/${tag.id}/status`, {
                          method: "PATCH",
                          body: JSON.stringify({ status: "ACTIVE" }),
                        })
                      }
                    >
                      {t("approve")}
                    </button>
                  ) : null}

                  {tag.status === "BLOCKED" ? (
                    <button
                      type="button"
                      className={smallButton}
                      disabled={busy}
                      onClick={() =>
                        mutate(`/admin/tags/${tag.id}/status`, {
                          method: "PATCH",
                          body: JSON.stringify({ status: "ACTIVE" }),
                        })
                      }
                    >
                      {t("unblock")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={smallButton}
                      disabled={busy}
                      onClick={() => {
                        if (!window.confirm(t("blockWarning"))) return;
                        mutate(`/admin/tags/${tag.id}/status`, {
                          method: "PATCH",
                          body: JSON.stringify({ status: "BLOCKED" }),
                        });
                      }}
                    >
                      {t("block")}
                    </button>
                  )}

                  <button
                    type="button"
                    className={smallButton}
                    disabled={busy}
                    onClick={() => {
                      setMergeSource(tag);
                      setPreview(null);
                      setMergeTargetSlug("");
                    }}
                  >
                    {t("merge")}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {data && data.pagination.totalPages > 1 ? (
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            className={smallButton}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("prev")}
          </button>
          <span className="text-xs text-muted-foreground">
            {t("pageOf", {
              page: data.pagination.page,
              totalPages: data.pagination.totalPages,
            })}
          </span>
          <button
            type="button"
            className={smallButton}
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("next")}
          </button>
        </div>
      ) : null}
    </PageFrame>
  );
}

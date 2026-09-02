"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageFrame, PageHeading, UserBanner } from "@/components/layout";
import { apiFetch, readApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth/tokens";

type AdminChannel = {
  id: string;
  slug: string;
  name: string;
  localizedName: string;
  isActive: boolean;
  videoCount: number;
  mediaItemCount: number;
};

type AdminSubcategory = {
  id: string;
  slug: string;
  name: string;
  localizedName: string;
  displayOrder: number;
  isActive: boolean;
  channels: AdminChannel[];
};

type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  localizedName: string;
  displayOrder: number;
  isActive: boolean;
  subcategories: AdminSubcategory[];
};

type UnmappedChannel = {
  id: string;
  slug: string;
  name: string;
  localizedName: string;
  isActive: boolean;
  videoCount: number;
  mediaItemCount: number;
};

type Impact = {
  name: string;
  subcategories: number;
  channels: number;
  videos: number;
  mediaItems: number;
  blockers: string[];
};

const card =
  "rounded-2xl border border-black/10 bg-black/[0.02] p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]";
const rowBase =
  "w-full rounded-xl border px-3 py-2 text-left text-sm transition";
const rowIdle =
  "border-black/10 hover:bg-black/[0.04] dark:border-white/10 dark:hover:bg-white/[0.06]";
const rowActive =
  "border-black/30 bg-black/[0.06] dark:border-white/30 dark:bg-white/[0.10]";
const smallButton =
  "rounded-lg border border-black/15 px-2 py-1 text-xs font-medium hover:bg-black/[0.04] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/[0.06]";
const input =
  "w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/15 dark:focus:border-white/40";

export default function AdminTaxonomyPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations("adminTaxonomy");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tNav = useTranslations("nav");
  const tAdmin = useTranslations("adminHub");

  const [tree, setTree] = useState<AdminCategory[]>([]);
  const [unmapped, setUnmapped] = useState<UnmappedChannel[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [newChannel, setNewChannel] = useState("");

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setErr("UNAUTHORIZED");
      setLoading(false);
      return;
    }

    try {
      const [treeRes, unmappedRes] = await Promise.all([
        apiFetch(`/admin/taxonomy/tree?locale=${locale}`, {
          cache: "no-store",
        }),
        apiFetch(`/admin/taxonomy/unmapped-channels?locale=${locale}`, {
          cache: "no-store",
        }),
      ]);

      if (treeRes.status === 401) throw new Error("UNAUTHORIZED");
      if (treeRes.status === 403) throw new Error("FORBIDDEN");
      if (!treeRes.ok) throw new Error(await readApiError(treeRes));

      setTree(await treeRes.json());
      setUnmapped(unmappedRes.ok ? await unmappedRes.json() : []);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedCategory = useMemo(
    () => tree.find((c) => c.id === categoryId) ?? null,
    [tree, categoryId],
  );
  const selectedSubcategory = useMemo(
    () =>
      selectedCategory?.subcategories.find((s) => s.id === subcategoryId) ??
      null,
    [selectedCategory, subcategoryId],
  );

  const allSubcategories = useMemo(
    () =>
      tree.flatMap((category) =>
        category.subcategories
          .filter((s) => s.isActive)
          .map((s) => ({
            id: s.id,
            label: `${category.localizedName} / ${s.localizedName}`,
          })),
      ),
    [tree],
  );

  /** Every mutation goes through here so errors and refresh behave consistently. */
  const mutate = async (
    path: string,
    init: RequestInit,
    successMessage?: string,
  ) => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiFetch(path, init);
      if (!res.ok) {
        setErr(await readApiError(res));
        return false;
      }
      if (successMessage) setNotice(successMessage);
      setErr(null);
      await load();
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : tErrors("generic"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  /** Impact is always fetched before a destructive action so the count is real. */
  const confirmWithImpact = async (
    entityType: "CATEGORY" | "SUBCATEGORY" | "CHANNEL",
    entityId: string,
    name: string,
  ) => {
    const res = await apiFetch(
      `/admin/taxonomy/impact?entityType=${entityType}&entityId=${entityId}`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      setErr(await readApiError(res));
      return false;
    }

    const impact: Impact = await res.json();

    if (impact.blockers.length) {
      setErr(t("impactBlocked", { reason: impact.blockers.join("; ") }));
      return false;
    }

    const summary = t("impactSummary", {
      channels: impact.channels,
      videos: impact.videos,
      mediaItems: impact.mediaItems,
    });

    return window.confirm(`${t("confirmArchive", { name })}\n\n${summary}`);
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    const ok = await mutate("/admin/categories", {
      method: "POST",
      body: JSON.stringify({ name: newCategory.trim() }),
    });
    if (ok) setNewCategory("");
  };

  const addSubcategory = async () => {
    if (!newSubcategory.trim() || !categoryId) return;
    const ok = await mutate("/admin/subcategories", {
      method: "POST",
      body: JSON.stringify({ categoryId, name: newSubcategory.trim() }),
    });
    if (ok) setNewSubcategory("");
  };

  const addChannel = async () => {
    if (!newChannel.trim() || !subcategoryId) return;
    const name = newChannel.trim();
    const ok = await mutate(
      "/admin/channels",
      {
        method: "POST",
        body: JSON.stringify({ name, subcategoryId }),
      },
      t("channelAdded", { name }),
    );
    if (ok) setNewChannel("");
  };

  const rename = async (
    kind: "categories" | "subcategories",
    id: string,
    current: string,
  ) => {
    const next = window.prompt(t("rename"), current);
    if (!next || next.trim() === current) return;
    await mutate(`/admin/${kind}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ name: next.trim() }),
    });
  };

  const reorderCategory = async (index: number, direction: -1 | 1) => {
    const ids = tree.map((c) => c.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await mutate("/admin/categories/reorder", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  };

  const reorderSubcategory = async (index: number, direction: -1 | 1) => {
    if (!selectedCategory) return;
    const ids = selectedCategory.subcategories.map((s) => s.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await mutate(`/admin/categories/${selectedCategory.id}/subcategories/reorder`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  };

  const moveChannel = async (channelId: string, destination: string) => {
    if (!destination) return;
    await mutate(`/admin/channels/${channelId}/move`, {
      method: "POST",
      body: JSON.stringify({ subcategoryId: destination }),
    });
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
            err === "UNAUTHORIZED" ? tErrors("unauthorized") : tAdmin("forbidden")
          }
          body={err === "UNAUTHORIZED" ? tAdmin("needSignIn") : undefined}
          primaryAction={{
            href: err === "UNAUTHORIZED" ? `/${locale}/login` : `/${locale}/admin`,
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

      {notice ? (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={card}>
          <h2 className="text-sm font-semibold">{t("categories")}</h2>

          <div className="mt-3 space-y-2">
            {tree.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("emptyCategories")}
              </p>
            ) : (
              tree.map((category, index) => (
                <div key={category.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryId(category.id);
                      setSubcategoryId(null);
                    }}
                    className={`${rowBase} ${
                      category.id === categoryId ? rowActive : rowIdle
                    }`}
                  >
                    <span className="font-medium">{category.localizedName}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {category.subcategories.length}
                    </span>
                    {!category.isActive ? (
                      <span className="ml-2 rounded-full border border-black/15 px-2 py-0.5 text-[10px] uppercase dark:border-white/15">
                        {t("archived")}
                      </span>
                    ) : null}
                  </button>

                  {category.id === categoryId ? (
                    <div className="flex flex-wrap gap-1 pl-1">
                      <button
                        type="button"
                        className={smallButton}
                        disabled={busy}
                        onClick={() =>
                          rename("categories", category.id, category.name)
                        }
                      >
                        {t("rename")}
                      </button>
                      <button
                        type="button"
                        className={smallButton}
                        disabled={busy || index === 0}
                        onClick={() => reorderCategory(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={smallButton}
                        disabled={busy || index === tree.length - 1}
                        onClick={() => reorderCategory(index, 1)}
                      >
                        ↓
                      </button>
                      {category.isActive ? (
                        <button
                          type="button"
                          className={smallButton}
                          disabled={busy}
                          onClick={async () => {
                            const confirmed = await confirmWithImpact(
                              "CATEGORY",
                              category.id,
                              category.localizedName,
                            );
                            if (confirmed) {
                              await mutate(
                                `/admin/categories/${category.id}/archive`,
                                { method: "POST" },
                              );
                            }
                          }}
                        >
                          {t("archive")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={smallButton}
                          disabled={busy}
                          onClick={() =>
                            mutate(`/admin/categories/${category.id}/restore`, {
                              method: "POST",
                            })
                          }
                        >
                          {t("restore")}
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              className={input}
              value={newCategory}
              placeholder={t("namePlaceholder")}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <button
              type="button"
              className={smallButton}
              disabled={busy || !newCategory.trim()}
              onClick={addCategory}
            >
              {t("add")}
            </button>
          </div>
        </section>

        <section className={card}>
          <h2 className="text-sm font-semibold">{t("subcategories")}</h2>

          {!selectedCategory ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("selectCategoryFirst")}
            </p>
          ) : (
            <>
              <div className="mt-3 space-y-2">
                {selectedCategory.subcategories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("emptySubcategories")}
                  </p>
                ) : (
                  selectedCategory.subcategories.map((subcategory, index) => (
                    <div key={subcategory.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setSubcategoryId(subcategory.id)}
                        className={`${rowBase} ${
                          subcategory.id === subcategoryId ? rowActive : rowIdle
                        }`}
                      >
                        <span className="font-medium">
                          {subcategory.localizedName}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {subcategory.channels.length}
                        </span>
                        {!subcategory.isActive ? (
                          <span className="ml-2 rounded-full border border-black/15 px-2 py-0.5 text-[10px] uppercase dark:border-white/15">
                            {t("archived")}
                          </span>
                        ) : null}
                      </button>

                      {subcategory.id === subcategoryId ? (
                        <div className="flex flex-wrap items-center gap-1 pl-1">
                          <button
                            type="button"
                            className={smallButton}
                            disabled={busy}
                            onClick={() =>
                              rename(
                                "subcategories",
                                subcategory.id,
                                subcategory.name,
                              )
                            }
                          >
                            {t("rename")}
                          </button>
                          <button
                            type="button"
                            className={smallButton}
                            disabled={busy || index === 0}
                            onClick={() => reorderSubcategory(index, -1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className={smallButton}
                            disabled={
                              busy ||
                              index === selectedCategory.subcategories.length - 1
                            }
                            onClick={() => reorderSubcategory(index, 1)}
                          >
                            ↓
                          </button>
                          {subcategory.isActive ? (
                            <button
                              type="button"
                              className={smallButton}
                              disabled={busy}
                              onClick={async () => {
                                const confirmed = await confirmWithImpact(
                                  "SUBCATEGORY",
                                  subcategory.id,
                                  subcategory.localizedName,
                                );
                                if (confirmed) {
                                  await mutate(
                                    `/admin/subcategories/${subcategory.id}/archive`,
                                    { method: "POST" },
                                  );
                                }
                              }}
                            >
                              {t("archive")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={smallButton}
                              disabled={busy}
                              onClick={() =>
                                mutate(
                                  `/admin/subcategories/${subcategory.id}/restore`,
                                  { method: "POST" },
                                )
                              }
                            >
                              {t("restore")}
                            </button>
                          )}

                          <select
                            className={smallButton}
                            defaultValue=""
                            disabled={busy}
                            onChange={(e) => {
                              const destination = e.target.value;
                              e.target.value = "";
                              if (destination) {
                                mutate(
                                  `/admin/subcategories/${subcategory.id}/move`,
                                  {
                                    method: "POST",
                                    body: JSON.stringify({
                                      categoryId: destination,
                                    }),
                                  },
                                );
                              }
                            }}
                          >
                            <option value="">{t("move")}</option>
                            {tree
                              .filter(
                                (c) => c.isActive && c.id !== selectedCategory.id,
                              )
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.localizedName}
                                </option>
                              ))}
                          </select>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  className={input}
                  value={newSubcategory}
                  placeholder={t("namePlaceholder")}
                  onChange={(e) => setNewSubcategory(e.target.value)}
                />
                <button
                  type="button"
                  className={smallButton}
                  disabled={busy || !newSubcategory.trim()}
                  onClick={addSubcategory}
                >
                  {t("add")}
                </button>
              </div>
            </>
          )}
        </section>

        <section className={card}>
          <h2 className="text-sm font-semibold">{t("channels")}</h2>

          {!selectedSubcategory ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("selectSubcategoryFirst")}
            </p>
          ) : (
            <>
              {selectedSubcategory.channels.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("emptyChannels")}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {selectedSubcategory.channels.map((channel) => (
                    <li
                      key={channel.id}
                      className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/10"
                    >
                      <div className="text-sm font-medium">
                        {channel.localizedName}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {channel.slug} •{" "}
                        {t("videos", { count: channel.videoCount })}
                        {!channel.isActive ? ` • ${t("archived")}` : ""}
                      </div>
                      <select
                        className={`${smallButton} mt-2`}
                        defaultValue=""
                        disabled={busy}
                        onChange={(e) => {
                          const destination = e.target.value;
                          e.target.value = "";
                          moveChannel(channel.id, destination);
                        }}
                      >
                        <option value="">{t("move")}</option>
                        {allSubcategories
                          .filter((s) => s.id !== selectedSubcategory.id)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                      </select>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex gap-2">
                <input
                  className={input}
                  value={newChannel}
                  placeholder={t("namePlaceholder")}
                  disabled={busy || !selectedSubcategory.isActive}
                  onChange={(e) => setNewChannel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addChannel();
                    }
                  }}
                />
                <button
                  type="button"
                  className={smallButton}
                  disabled={
                    busy ||
                    !newChannel.trim() ||
                    !selectedSubcategory.isActive
                  }
                  onClick={addChannel}
                >
                  {t("add")}
                </button>
              </div>
              {!selectedSubcategory.isActive ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("addChannelArchivedHint")}
                </p>
              ) : null}
            </>
          )}
        </section>
      </div>

      <section className={`${card} mt-4`}>
        <h2 className="text-sm font-semibold">{t("unmappedTitle")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("unmappedDescription")}
        </p>

        {unmapped.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("unmappedEmpty")}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {unmapped.map((channel) => (
              <li
                key={channel.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10"
              >
                <div>
                  <div className="text-sm font-medium">
                    {channel.localizedName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {channel.slug} • {t("videos", { count: channel.videoCount })}
                  </div>
                </div>

                <select
                  className={smallButton}
                  defaultValue=""
                  disabled={busy}
                  onChange={(e) => {
                    const destination = e.target.value;
                    e.target.value = "";
                    moveChannel(channel.id, destination);
                  }}
                >
                  <option value="">{t("mapTo")}</option>
                  {allSubcategories.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageFrame>
  );
}

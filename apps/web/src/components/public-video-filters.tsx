"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type Channel = { id: string; slug: string; name: string };
type Tag = { id: string; slug: string; name: string };
type Subcategory = { id: string; slug: string; name: string; channels: Channel[] };
type Category = { id: string; slug: string; name: string; subcategories: Subcategory[] };

export type PublicVideoFilterValues = {
  q: string;
  category: string;
  subcategory: string;
  channel: string;
  tag: string;
};

const control =
  "rounded-xl border border-black/15 bg-background px-3 py-2 text-sm dark:border-white/15";
const btnPrimary =
  "rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90";
const btnGhost =
  "rounded-xl border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]";

/**
 * Filter bar for /videos. Category and subcategory narrow the channel list
 * client-side and are also sent to the API, which resolves them through
 * channel -> subcategory -> category.
 */
export default function PublicVideoFilters({
  locale,
  initial,
}: {
  locale: string;
  initial: PublicVideoFilterValues;
}) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const router = useRouter();
  const t = useTranslations("videosPage");

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [values, setValues] = useState<PublicVideoFilterValues>(initial);

  useEffect(() => {
    fetch(`${api}/categories?locale=${locale}`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});

    fetch(`${api}/tags?locale=${locale}`)
      .then((r) => r.json())
      .then(setTags)
      .catch(() => {});
  }, [api, locale]);

  const category = useMemo(
    () => categories.find((c) => c.slug === values.category) ?? null,
    [categories, values.category],
  );
  const subcategory = useMemo(
    () =>
      category?.subcategories.find((s) => s.slug === values.subcategory) ?? null,
    [category, values.subcategory],
  );

  const channelOptions = useMemo(() => {
    if (subcategory) return subcategory.channels;
    if (category) return category.subcategories.flatMap((s) => s.channels);
    return categories.flatMap((c) =>
      c.subcategories.flatMap((s) => s.channels),
    );
  }, [categories, category, subcategory]);

  const apply = () => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
    }
    router.push(`/${locale}/videos${params.size ? `?${params}` : ""}`);
  };

  const set = (patch: Partial<PublicVideoFilterValues>) =>
    setValues((prev) => ({ ...prev, ...patch }));

  return (
    <form
      className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <div className="grid gap-3 md:grid-cols-3">
        <input
          className={`${control} md:col-span-3`}
          placeholder={t("searchPlaceholder")}
          value={values.q}
          onChange={(e) => set({ q: e.target.value })}
        />

        <label className="grid gap-1 text-xs text-muted-foreground">
          {t("category")}
          <select
            className={control}
            value={values.category}
            onChange={(e) =>
              set({ category: e.target.value, subcategory: "", channel: "" })
            }
          >
            <option value="">{t("allCategories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs text-muted-foreground">
          {t("subcategory")}
          <select
            className={control}
            value={values.subcategory}
            disabled={!category}
            onChange={(e) =>
              set({ subcategory: e.target.value, channel: "" })
            }
          >
            <option value="">{t("allSubcategories")}</option>
            {category?.subcategories.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs text-muted-foreground">
          {t("channel")}
          <select
            className={control}
            value={values.channel}
            onChange={(e) => set({ channel: e.target.value })}
          >
            <option value="">{t("allChannels")}</option>
            {channelOptions.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs text-muted-foreground md:col-span-3">
          {t("tag")}
          <select
            className={control}
            value={values.tag}
            onChange={(e) => set({ tag: e.target.value })}
          >
            <option value="">{t("allTags")}</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.slug}>
                {tag.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" className={btnPrimary}>
          {t("search")}
        </button>
        <button
          type="button"
          className={btnGhost}
          onClick={() => {
            setValues({
              q: "",
              category: "",
              subcategory: "",
              channel: "",
              tag: "",
            });
            router.push(`/${locale}/videos`);
          }}
        >
          {t("clear")}
        </button>
      </div>
    </form>
  );
}

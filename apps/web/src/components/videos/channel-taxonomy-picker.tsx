"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

export type TaxonomyChannel = { id: string; slug: string; name: string };

export type TaxonomySubcategory = {
  id: string;
  slug: string;
  name: string;
  channels: TaxonomyChannel[];
};

export type TaxonomyCategory = {
  id: string;
  slug: string;
  name: string;
  subcategories: TaxonomySubcategory[];
};

type Props = {
  tree: TaxonomyCategory[];
  /** Channels that exist but are not mapped into the hierarchy yet. */
  unmappedChannels: TaxonomyChannel[];
  selected: string[];
  primary: string | null;
  disabled?: boolean;
  onChange: (selected: string[], primary: string | null) => void;
};

const chip =
  "inline-flex items-center gap-2 rounded-xl border border-black/15 px-3 py-1 text-sm dark:border-white/15";
const select =
  "w-full rounded-xl border border-black/15 bg-transparent p-2 text-sm dark:border-white/15";

/**
 * Cascading Category > Subcategory > Channel picker.
 *
 * Contributors choose channels here but can never create taxonomy: the selects are
 * driven entirely by what admins have published. Multi-channel selection is
 * preserved; the primary radio only decides which channel supplies the breadcrumb.
 */
export function ChannelTaxonomyPicker({
  tree,
  unmappedChannels,
  selected,
  primary,
  disabled,
  onChange,
}: Props) {
  const t = useTranslations("dashboard.form");
  const [categorySlug, setCategorySlug] = useState("");
  const [subcategorySlug, setSubcategorySlug] = useState("");

  const category = useMemo(
    () => tree.find((c) => c.slug === categorySlug) ?? null,
    [tree, categorySlug],
  );
  const subcategory = useMemo(
    () => category?.subcategories.find((s) => s.slug === subcategorySlug) ?? null,
    [category, subcategorySlug],
  );

  const channelsBySlug = useMemo(() => {
    const map = new Map<string, TaxonomyChannel>();
    for (const c of tree) {
      for (const s of c.subcategories) {
        for (const channel of s.channels) map.set(channel.slug, channel);
      }
    }
    for (const channel of unmappedChannels) map.set(channel.slug, channel);
    return map;
  }, [tree, unmappedChannels]);

  // Preselect the drill-down to wherever the current primary channel lives, so
  // reopening a draft does not start from a blank hierarchy.
  useEffect(() => {
    if (categorySlug || !primary) return;

    for (const c of tree) {
      for (const s of c.subcategories) {
        if (s.channels.some((channel) => channel.slug === primary)) {
          setCategorySlug(c.slug);
          setSubcategorySlug(s.slug);
          return;
        }
      }
    }
  }, [tree, primary, categorySlug]);

  const toggle = (slug: string) => {
    if (disabled) return;

    const next = selected.includes(slug)
      ? selected.filter((s) => s !== slug)
      : [...selected, slug];

    // The primary must always be one of the selected channels.
    const nextPrimary =
      primary && next.includes(primary) ? primary : (next[0] ?? null);

    onChange(next, nextPrimary);
  };

  const available = subcategory?.channels ?? [];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t("category")}</span>
          <select
            className={select}
            value={categorySlug}
            disabled={disabled}
            onChange={(e) => {
              setCategorySlug(e.target.value);
              setSubcategorySlug("");
            }}
          >
            <option value="">{t("selectCategory")}</option>
            {tree.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">{t("subcategory")}</span>
          <select
            className={select}
            value={subcategorySlug}
            disabled={disabled || !category}
            onChange={(e) => setSubcategorySlug(e.target.value)}
          >
            <option value="">{t("selectSubcategory")}</option>
            {category?.subcategories.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {subcategory ? (
        <div className="space-y-2">
          <div className="text-sm font-medium">{t("availableChannels")}</div>
          <div className="flex flex-wrap gap-2">
            {available.map((channel) => (
              <button
                key={channel.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(channel.slug)}
                className={`rounded-xl border px-3 py-1 text-sm ${
                  selected.includes(channel.slug)
                    ? "border-blue-500 bg-blue-100 font-semibold dark:bg-blue-900"
                    : "border-black/15 dark:border-white/15"
                }`}
              >
                {channel.name}
              </button>
            ))}
            {available.length === 0 ? (
              <span className="text-sm text-muted-foreground">—</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {unmappedChannels.length ? (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">
            {t("otherChannels")}
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {unmappedChannels.map((channel) => (
              <button
                key={channel.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(channel.slug)}
                className={`rounded-xl border px-3 py-1 text-sm ${
                  selected.includes(channel.slug)
                    ? "border-blue-500 bg-blue-100 font-semibold dark:bg-blue-900"
                    : "border-black/15 dark:border-white/15"
                }`}
              >
                {channel.name}
              </button>
            ))}
          </div>
        </details>
      ) : null}

      <div className="space-y-2">
        <div className="text-sm font-medium">{t("selectedChannels")}</div>

        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("noChannelsSelected")}
          </p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-2">
              {selected.map((slug) => (
                <li key={slug} className={chip}>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="primary-channel"
                      checked={primary === slug}
                      disabled={disabled}
                      onChange={() => onChange(selected, slug)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {t("primaryChannel")}
                    </span>
                  </label>

                  <span>{channelsBySlug.get(slug)?.name ?? slug}</span>

                  <button
                    type="button"
                    aria-label={t("remove")}
                    disabled={disabled}
                    onClick={() => toggle(slug)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {t("primaryChannelHint")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

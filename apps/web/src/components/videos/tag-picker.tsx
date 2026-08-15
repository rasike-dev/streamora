"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export type TagOption = { id: string; slug: string; name: string };

/** A chip is either an existing tag (has a slug) or a not-yet-created name. */
export type TagSelection = { slug?: string; name: string };

type Props = {
  options: TagOption[];
  value: TagSelection[];
  max: number;
  disabled?: boolean;
  onChange: (next: TagSelection[]) => void;
  /** Called as the user types so the parent can query the tag search endpoint. */
  onQueryChange?: (query: string) => void;
};

const key = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Autocomplete-with-create tag control. New names are kept client-side until save;
 * the API resolves them through the governed findOrCreate path, so a name that
 * already exists under a different casing or alias never becomes a duplicate tag.
 */
export function TagPicker({
  options,
  value,
  max,
  disabled,
  onChange,
  onQueryChange,
}: Props) {
  const t = useTranslations("dashboard.form");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onQueryChange?.(query);
  }, [query, onQueryChange]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  const selectedKeys = useMemo(
    () => new Set(value.map((v) => key(v.name))),
    [value],
  );

  const suggestions = useMemo(() => {
    const q = key(query);
    return options
      .filter((o) => !selectedKeys.has(key(o.name)))
      .filter((o) => (q ? key(o.name).includes(q) : true))
      .slice(0, 8);
  }, [options, selectedKeys, query]);

  const atMax = value.length >= max;
  const trimmed = query.trim();
  const canCreate =
    trimmed.length > 0 &&
    !atMax &&
    !selectedKeys.has(key(trimmed)) &&
    !options.some((o) => key(o.name) === key(trimmed));

  const add = (selection: TagSelection) => {
    if (disabled || atMax || selectedKeys.has(key(selection.name))) return;
    onChange([...value, selection]);
    setQuery("");
    setOpen(false);
  };

  const remove = (name: string) => {
    if (disabled) return;
    onChange(value.filter((v) => key(v.name) !== key(name)));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const exact = suggestions.find((o) => key(o.name) === key(trimmed));
      if (exact) add({ slug: exact.slug, name: exact.name });
      else if (canCreate) add({ name: trimmed });
      return;
    }

    if (event.key === "Backspace" && !query && value.length) {
      remove(value[value.length - 1]!.name);
    }
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="text-sm font-medium">{t("tags")}</div>

      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={key(tag.name)}
            className="inline-flex items-center gap-2 rounded-xl border border-black/15 px-3 py-1 text-sm dark:border-white/15"
          >
            {tag.name}
            {!tag.slug ? (
              <span className="rounded-md bg-amber-100 px-1 text-[10px] uppercase text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                {t("newTagBadge")}
              </span>
            ) : null}
            <button
              type="button"
              aria-label={t("remove")}
              disabled={disabled}
              onClick={() => remove(tag.name)}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="relative">
        <input
          className="w-full rounded-xl border border-black/15 bg-transparent p-2 text-sm dark:border-white/15"
          placeholder={t("tagPlaceholder")}
          value={query}
          disabled={disabled || atMax}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />

        {open && !disabled && !atMax && (suggestions.length > 0 || canCreate) ? (
          <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-black/15 bg-white p-1 text-sm shadow-lg dark:border-white/15 dark:bg-neutral-900">
            {suggestions.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  className="w-full rounded-lg px-2 py-1 text-left hover:bg-black/5 dark:hover:bg-white/10"
                  onClick={() => add({ slug: option.slug, name: option.name })}
                >
                  {option.name}
                </button>
              </li>
            ))}
            {canCreate ? (
              <li>
                <button
                  type="button"
                  className="w-full rounded-lg px-2 py-1 text-left font-medium hover:bg-black/5 dark:hover:bg-white/10"
                  onClick={() => add({ name: trimmed })}
                >
                  {t("createTag", { name: trimmed })}
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}

        {open && !canCreate && suggestions.length === 0 && trimmed ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("noSuggestions")}
          </p>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        {t("tagsHint")} ({value.length}/{max})
      </p>
    </div>
  );
}

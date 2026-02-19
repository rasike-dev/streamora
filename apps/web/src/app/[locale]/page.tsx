"use client";

import {useTranslations} from "next-intl";
import Link from "next/link";
import {ThemeToggle} from "@/components/theme-toggle";

export default function Home() {
  const t = useTranslations();

  return (
    <main className="min-h-dvh p-4">
      <header className="mb-6">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-2xl font-semibold">{t("app.name")}</h1>
          <ThemeToggle />
        </div>
        <p className="text-sm text-muted-foreground">
          Creator-verified video platform (Phase 0–2 build)
        </p>
      </header>

      <section className="space-y-3">
        <Link className="block rounded-xl border p-4" href="/login">
          {t("nav.login")}
        </Link>
        <Link className="block rounded-xl border p-4" href="/dashboard">
          {t("nav.dashboard")}
        </Link>
        <Link className="block rounded-xl border p-4" href="/upload">
          Upload Video
        </Link>
        <Link className="block rounded-xl border p-4" href="/admin">
          {t("nav.admin")}
        </Link>
      </section>
    </main>
  );
}

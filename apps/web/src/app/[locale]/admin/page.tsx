"use client";

import {useTranslations} from "next-intl";

export default function AdminPage() {
  const t = useTranslations();

  return (
    <main className="min-h-dvh p-4">
      <h1 className="text-xl font-semibold mb-2">{t("nav.admin")}</h1>
      <p className="text-sm text-muted-foreground">Moderation & user management coming soon.</p>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  PageFrame,
  PageHeading,
  UserBanner,
} from "@/components/layout";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth/tokens";

type JobRow = {
  id: string;
  videoId: string;
  videoTitle: string | null;
  jobType: string;
  status: string;
  attempts: number;
  lastError: string | null;
  correlationId: string | null;
  createdAt: string;
};

export default function AdminJobsPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const tJobs = useTranslations("jobsPage");
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const tAdmin = useTranslations("adminHub");

  const [rows, setRows] = useState<JobRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (!getAccessToken()) {
      setErr("UNAUTHORIZED");
      setLoading(false);
      return;
    }

    apiFetch(`/admin/jobs?status=FAILED`)
      .then(async (r) => {
        if (r.status === 401) {
          throw new Error("UNAUTHORIZED");
        }
        if (r.status === 403) {
          throw new Error("FORBIDDEN");
        }
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then(setRows)
      .catch((e) => setErr(e.message === "FORBIDDEN" ? "FORBIDDEN" : e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageFrame>
        <PageHeading
          title={tJobs("title")}
          backHref={`/${locale}/admin`}
          backLabel={tJobs("backAdmin")}
        />
        <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <PageHeading
        title={tJobs("title")}
        backHref={`/${locale}/admin`}
        backLabel={tJobs("backAdmin")}
      />

      {err === "UNAUTHORIZED" ? (
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
      ) : err === "FORBIDDEN" ? (
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
      ) : err ? (
        <UserBanner
          variant="error"
          title={tErrors("generic")}
          body={err}
          secondaryAction={{
            href: `/${locale}/admin`,
            label: tJobs("backAdmin"),
          }}
        />
      ) : null}

      {!err ? (
        <div className="space-y-3">
          {rows.map((j) => (
            <div
              key={j.id}
              className="space-y-2 rounded-xl border border-black/10 p-4 dark:border-white/10"
            >
              <div className="text-sm font-medium">
                {j.videoTitle || "(untitled video)"}
              </div>

              <div className="text-xs text-muted-foreground">
                {j.jobType} • {j.status} • attempts: {j.attempts}
              </div>

              {j.lastError && (
                <div className="whitespace-pre-wrap text-xs text-red-600 dark:text-red-400">
                  {j.lastError}
                </div>
              )}

              {j.correlationId && (
                <div className="break-all text-[11px] text-muted-foreground">
                  correlationId: {j.correlationId}
                </div>
              )}
            </div>
          ))}

          {!rows.length && (
            <div className="rounded-xl border border-black/10 p-4 text-sm text-muted-foreground dark:border-white/10">
              {tJobs("emptyFailed")}
            </div>
          )}
        </div>
      ) : null}
    </PageFrame>
  );
}

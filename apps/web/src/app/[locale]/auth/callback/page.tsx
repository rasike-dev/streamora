"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  PageFrame,
  PageHeading,
  UserBanner,
} from "@/components/layout";
import { setTokens } from "@/lib/auth/tokens";

type CallbackStatus = "loading" | "success" | "error";

type ErrorKind = "invalid_state" | "token_exchange" | "no_access_token" | null;

export default function CallbackPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations("authCallback");
  const tCommon = useTranslations("common");
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const [tokenStatus, setTokenStatus] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const issuer = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER!;
      const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      const state = searchParams.get("state");

      const expectedState = sessionStorage.getItem("kc_state");
      if (!code || !state || state !== expectedState) {
        setErrorKind("invalid_state");
        setStatus("error");
        return;
      }

      const tokenUrl = `${issuer}/protocol/openid-connect/token`;

      const body = new URLSearchParams();
      body.set("grant_type", "authorization_code");
      body.set("client_id", clientId);
      body.set("code", code);
      body.set("redirect_uri", `${appUrl}/${locale}/auth/callback`);

      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Token exchange error:", {
          status: res.status,
          statusText: res.statusText,
          error: errorText,
        });
        setErrorKind("token_exchange");
        setTokenStatus(String(res.status));
        setStatus("error");
        return;
      }

      const data = await res.json();
      if (!data.access_token) {
        console.error("Token response:", data);
        setErrorKind("no_access_token");
        setStatus("error");
        return;
      }

      setTokens(data.access_token, data.refresh_token || "");

      // Ensure backend user/profile and roles are provisioned for this token.
      const api = process.env.NEXT_PUBLIC_API_URL!;
      await fetch(`${api}/me`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      }).catch(() => {
        // Non-blocking: dashboard handles temporary API issues with retry UI.
      });

      setStatus("success");
      window.location.href = `/${locale}/dashboard`;
    };

    run();
  }, [locale]);

  const errorBody =
    errorKind === "token_exchange" && tokenStatus
      ? t("tokenExchangeFailed", { status: tokenStatus })
      : errorKind === "invalid_state"
        ? t("invalidState")
        : errorKind === "no_access_token"
          ? t("noAccessToken")
          : t("errorBody");

  return (
    <PageFrame>
      <PageHeading title={tCommon("login")} />

      {status === "loading" ? (
        <UserBanner variant="info" title={t("processing")} />
      ) : null}

      {status === "success" ? (
        <UserBanner
          variant="success"
          title={t("successTitle")}
          body={t("successBody")}
        />
      ) : null}

      {status === "error" ? (
        <UserBanner
          variant="error"
          title={t("errorTitle")}
          body={errorBody}
          primaryAction={{
            href: `/${locale}/login`,
            label: t("tryAgain"),
          }}
          secondaryAction={{
            href: `/${locale}`,
            label: t("goHome"),
          }}
        />
      ) : null}
    </PageFrame>
  );
}

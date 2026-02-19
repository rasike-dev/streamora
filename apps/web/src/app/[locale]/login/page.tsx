"use client";

import {useTranslations} from "next-intl";
import {usePathname} from "next/navigation";

export default function LoginPage() {
  const t = useTranslations();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "en";

  const issuer = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER!;
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const login = () => {
    const redirectUri = encodeURIComponent(`${appUrl}/${locale}/auth/callback`);
    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();

    sessionStorage.setItem("kc_state", state);
    sessionStorage.setItem("kc_nonce", nonce);

    const url =
      `${issuer}/protocol/openid-connect/auth` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&scope=openid%20profile%20email` +
      `&state=${encodeURIComponent(state)}` +
      `&nonce=${encodeURIComponent(nonce)}`;

    window.location.href = url;
  };

  return (
    <main className="min-h-dvh p-4">
      <h1 className="text-xl font-semibold mb-2">{t("login.title")}</h1>
      <p className="text-sm text-muted-foreground mb-4">Sign in via Keycloak.</p>
      <button className="rounded-xl border px-4 py-2" onClick={login}>
        {t("login.cta")}
      </button>
    </main>
  );
}

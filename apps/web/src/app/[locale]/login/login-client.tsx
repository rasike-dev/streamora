'use client';

import { useTranslations } from 'next-intl';

export function LoginClient({ locale }: { locale: string }) {
  const t = useTranslations('login');

  const issuer = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER!;
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const login = () => {
    const redirectUri = encodeURIComponent(`${appUrl}/${locale}/auth/callback`);
    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();

    sessionStorage.setItem('kc_state', state);
    sessionStorage.setItem('kc_nonce', nonce);

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
    <button
      type="button"
      className="rounded-xl border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
      onClick={login}
    >
      {t('cta')}
    </button>
  );
}

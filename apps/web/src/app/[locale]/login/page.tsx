import { getTranslations } from 'next-intl/server';
import {
  PageFrame,
  PageHeading,
  UserBanner,
} from '@/components/layout';
import { LoginClient } from './login-client';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LoginPage({ params }: PageProps) {
  const { locale } = await params;
  const tCommon = await getTranslations({ locale, namespace: 'common' });
  const tLogin = await getTranslations({ locale, namespace: 'login' });

  const issuer = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER?.trim();
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const envIncomplete = !issuer || !clientId || !appUrl;

  return (
    <div className="flex-1">
      <PageFrame>
        <PageHeading
          title={tLogin('title')}
          description={tLogin('subtitle')}
          backHref={`/${locale}`}
          backLabel={tCommon('backToHome')}
        />

        {envIncomplete ? (
          <UserBanner variant="error" title={tLogin('envMissing')} />
        ) : (
          <LoginClient locale={locale} />
        )}
      </PageFrame>
    </div>
  );
}

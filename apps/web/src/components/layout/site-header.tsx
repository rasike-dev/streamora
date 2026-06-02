import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LandingHeaderActions } from '@/components/landing-header-actions';
import { AuthNavLink } from '@/components/layout/auth-nav-link';

export async function SiteHeader({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'common' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tApp = await getTranslations({ locale, namespace: 'app' });

  const navBtn =
    'rounded-xl border border-black/15 px-3 py-2 text-sm font-medium transition hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]';

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
        <Link
          href={`/${locale}`}
          className="text-lg font-semibold tracking-tight shrink-0"
        >
          {tApp('name')}
        </Link>
        <nav className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <Link
            href={`/${locale}/videos`}
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            {t('browseVideos')}
          </Link>
          <Link href={`/${locale}/upload`} className={`inline-flex ${navBtn}`}>
            {t('upload')}
          </Link>
          <Link href={`/${locale}/dashboard`} className={`inline-flex ${navBtn}`}>
            {t('dashboard')}
          </Link>
          <AuthNavLink locale={locale} label={tNav('login')} className={navBtn} />
          <LandingHeaderActions />
        </nav>
      </div>
    </header>
  );
}

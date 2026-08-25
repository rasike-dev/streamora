import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LandingHeaderActions } from '@/components/landing-header-actions';
import { AdminNavLink } from '@/components/layout/admin-nav-link';
import { AuthNavLink } from '@/components/layout/auth-nav-link';
import { CreatorNavLinks } from '@/components/layout/creator-nav-links';
import { BrandLogo } from '@/components/layout/brand-logo';
import { brand } from '@/lib/brand';

export async function SiteHeader({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'common' });
  const tNav = await getTranslations({ locale, namespace: 'nav' });
  const tTaxonomy = await getTranslations({ locale, namespace: 'taxonomy' });

  const navBtn =
    'rounded-xl border border-black/15 px-3 py-2 text-sm font-medium transition hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]';

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:py-4">
        <Link
          href={`/${locale}`}
          className="min-w-0 shrink-0 transition opacity-90 hover:opacity-100"
          aria-label={brand.name}
        >
          <BrandLogo variant="header" priority />
        </Link>
        <nav className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5 sm:gap-2 md:gap-3">
          <Link
            href={`/${locale}/videos`}
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            {t('browseVideos')}
          </Link>
          <Link
            href={`/${locale}/media`}
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            {t('browseMedia')}
          </Link>
          <Link
            href={`/${locale}/categories`}
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            {tTaxonomy('categories')}
          </Link>
          <Link href={`/${locale}/upload`} className={`inline-flex ${navBtn}`}>
            {t('uploadVideo')}
          </Link>
          <CreatorNavLinks
            locale={locale}
            myMediaLabel={t('myMedia')}
            uploadMediaLabel={t('uploadMedia')}
            className={`inline-flex ${navBtn}`}
          />
          <Link href={`/${locale}/dashboard`} className={`inline-flex ${navBtn}`}>
            {t('dashboard')}
          </Link>
          <AdminNavLink
            locale={locale}
            label={tNav('admin')}
            className={`inline-flex ${navBtn}`}
          />
          <AuthNavLink
            locale={locale}
            loginLabel={tNav('login')}
            logoutLabel={tNav('logout')}
            className={navBtn}
          />
          <LandingHeaderActions />
        </nav>
      </div>
    </header>
  );
}

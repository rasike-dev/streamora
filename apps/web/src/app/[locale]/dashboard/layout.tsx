import { SiteHeader } from '@/components/layout/site-header';
import { BrandLogo } from '@/components/layout/brand-logo';

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader locale={locale} />
      <div className="border-b border-black/10 bg-gradient-to-b from-black/[0.04] via-black/[0.02] to-transparent px-4 py-6 dark:border-white/10 dark:from-white/[0.06] dark:via-white/[0.03] sm:py-8">
        <div className="mx-auto max-w-5xl">
          <BrandLogo variant="dashboard" priority />
        </div>
      </div>
      <main className="flex-1">{children}</main>
    </div>
  );
}

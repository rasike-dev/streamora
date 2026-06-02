import { SiteHeader } from '@/components/layout/site-header';

export default async function AuthCallbackLayout({
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
      <main className="flex-1">{children}</main>
    </div>
  );
}

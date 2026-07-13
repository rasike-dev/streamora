import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ locale: string }>;
};

/** Legacy route — Clerk sign-in lives at /[locale]/sign-in */
export default async function LoginRedirectPage({ params }: PageProps) {
  const { locale } = await params;
  redirect(`/${locale}/sign-in`);
}

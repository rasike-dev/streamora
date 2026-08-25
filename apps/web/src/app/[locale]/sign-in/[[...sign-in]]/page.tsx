import { SignIn } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import { BrandLogo } from "@/components/layout/brand-logo";
import { PageFrame, PageHeading } from "@/components/layout";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function SignInPage({
  params,
}: PageProps) {
  const { locale } = await params;
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tLogin = await getTranslations({ locale, namespace: "login" });

  return (
    <PageFrame>
      <BrandLogo variant="auth" className="mb-6" />
      <PageHeading
        title={tLogin("title")}
        description={tLogin("subtitle")}
        backHref={`/${locale}`}
        backLabel={tCommon("backToHome")}
      />
      <div className="mx-auto flex max-w-md justify-center">
        <SignIn
          routing="path"
          path={`/${locale}/sign-in`}
          signUpUrl={`/${locale}/sign-up`}
          fallbackRedirectUrl={`/${locale}/dashboard`}
        />
      </div>
    </PageFrame>
  );
}

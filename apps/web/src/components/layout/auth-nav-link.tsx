"use client";

import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export function AuthNavLink({
  locale,
  loginLabel,
  className,
}: {
  locale: string;
  loginLabel: string;
  logoutLabel: string;
  className: string;
}) {
  return (
    <>
      <SignedOut>
        <Link href={`/${locale}/sign-in`} className={className}>
          {loginLabel}
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton
          afterSignOutUrl={`/${locale}`}
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </SignedIn>
    </>
  );
}

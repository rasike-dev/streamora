"use client";

import Link from "next/link";
import { SignedIn } from "@clerk/nextjs";

export function CreatorNavLinks({
  locale,
  myMediaLabel,
  uploadMediaLabel,
  className,
}: {
  locale: string;
  myMediaLabel: string;
  uploadMediaLabel: string;
  className: string;
}) {
  return (
    <SignedIn>
      <Link href={`/${locale}/dashboard/media`} className={className}>
        {myMediaLabel}
      </Link>
      <Link href={`/${locale}/upload/media`} className={className}>
        {uploadMediaLabel}
      </Link>
    </SignedIn>
  );
}

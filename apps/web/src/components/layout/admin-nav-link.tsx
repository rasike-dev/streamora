"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { getRolesFromMetadata, hasAdminAccess } from "@/lib/auth/roles";

export function AdminNavLink({
  locale,
  label,
  className,
}: {
  locale: string;
  label: string;
  className: string;
}) {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) return null;

  const roles = getRolesFromMetadata(user.publicMetadata);
  if (!hasAdminAccess(roles)) return null;

  return (
    <Link href={`/${locale}/admin`} className={className}>
      {label}
    </Link>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getValidAccessToken } from "@/lib/auth/tokens";
import { canAccessAdminFromToken } from "@/lib/auth/roles";

export function AdminNavLink({
  locale,
  label,
  className,
}: {
  locale: string;
  label: string;
  className: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      const token = await getValidAccessToken();
      if (active) setShow(canAccessAdminFromToken(token));
    };

    sync();

    const onExpired = () => {
      if (active) setShow(false);
    };
    window.addEventListener("auth:expired", onExpired);

    return () => {
      active = false;
      window.removeEventListener("auth:expired", onExpired);
    };
  }, []);

  if (!show) return null;

  return (
    <Link href={`/${locale}/admin`} className={className}>
      {label}
    </Link>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getValidAccessToken } from "@/lib/auth/tokens";

export function AuthNavLink({
  locale,
  label,
  className,
}: {
  locale: string;
  label: string;
  className: string;
}) {
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      // Attempts a silent refresh when the access token is stale.
      const token = await getValidAccessToken();
      if (active) setShowLogin(!token);
    };

    sync();

    const onExpired = () => {
      if (active) setShowLogin(true);
    };
    window.addEventListener("auth:expired", onExpired);

    return () => {
      active = false;
      window.removeEventListener("auth:expired", onExpired);
    };
  }, []);

  if (!showLogin) return null;

  return (
    <Link href={`/${locale}/login`} className={className}>
      {label}
    </Link>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getValidAccessToken, logout } from "@/lib/auth/tokens";

export function AuthNavLink({
  locale,
  loginLabel,
  logoutLabel,
  className,
}: {
  locale: string;
  loginLabel: string;
  logoutLabel: string;
  className: string;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      // Attempts a silent refresh when the access token is stale.
      const token = await getValidAccessToken();
      if (active) setIsAuthenticated(Boolean(token));
    };

    sync();

    const onExpired = () => {
      if (active) setIsAuthenticated(false);
    };
    window.addEventListener("auth:expired", onExpired);

    return () => {
      active = false;
      window.removeEventListener("auth:expired", onExpired);
    };
  }, []);

  if (isAuthenticated) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => logout(locale)}
      >
        {logoutLabel}
      </button>
    );
  }

  return (
    <Link href={`/${locale}/login`} className={className}>
      {loginLabel}
    </Link>
  );
}

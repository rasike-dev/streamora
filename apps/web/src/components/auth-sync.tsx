"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { registerClerkTokenGetter } from "@/lib/auth/tokens";

const JWT_TEMPLATE = "streamora-api";

/** Provisions the Streamora DB user on sign-in via GET /me. */
export function AuthSync() {
  const { isLoaded, isSignedIn, getToken, sessionId } = useAuth();
  const clerk = useClerk();

  useEffect(() => {
    registerClerkTokenGetter(async (options) => {
      if (!isSignedIn) return null;

      if (options?.reloadSession) {
        try {
          await clerk.session?.reload();
        } catch {
          // Best-effort refresh before fetching a token.
        }
      }

      try {
        const templateToken = await getToken({
          template: JWT_TEMPLATE,
          skipCache: options?.skipCache,
        });
        if (templateToken) return templateToken;
      } catch {
        // Fall through to the default session JWT.
      }

      try {
        return await getToken({ skipCache: options?.skipCache });
      } catch {
        return null;
      }
    });

    return () => registerClerkTokenGetter(null);
  }, [clerk, getToken, isSignedIn, sessionId]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    apiFetch("/me").catch(() => {
      // Non-fatal; protected pages will surface auth errors if sync fails.
    });
  }, [isLoaded, isSignedIn, sessionId]);

  return null;
}

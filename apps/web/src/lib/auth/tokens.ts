const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

// Refresh slightly before the real expiry to avoid racing the clock.
const EXPIRY_SKEW_SECONDS = 30;

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken?: string | null) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken !== undefined && refreshToken !== null) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.dispatchEvent(new Event("auth:expired"));
}

/** Clears local session and redirects through Keycloak end-session. */
export function logout(locale = "en") {
  if (typeof window === "undefined") return;

  clearTokens();

  const issuer = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER;
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!issuer || !clientId || !appUrl) {
    window.location.href = `/${locale}`;
    return;
  }

  const postLogoutRedirectUri = encodeURIComponent(`${appUrl}/${locale}`);
  window.location.href =
    `${issuer}/protocol/openid-connect/logout` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&post_logout_redirect_uri=${postLogoutRedirectUri}`;
}

function decodeExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return typeof payload?.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, skewSeconds = EXPIRY_SKEW_SECONDS): boolean {
  const exp = decodeExp(token);
  if (!exp) return true;
  return exp * 1000 <= Date.now() + skewSeconds * 1000;
}

// Single-flight guard so concurrent requests don't all hit Keycloak at once.
let refreshPromise: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function doRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    return null;
  }

  const issuer = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER;
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
  if (!issuer || !clientId) {
    return null;
  }

  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("client_id", clientId);
  body.set("refresh_token", refreshToken);

  try {
    const res = await fetch(`${issuer}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      // Refresh token is invalid/expired -> force re-login.
      clearTokens();
      return null;
    }

    const data = await res.json();
    if (!data.access_token) {
      clearTokens();
      return null;
    }

    setTokens(data.access_token, data.refresh_token ?? refreshToken);
    return data.access_token as string;
  } catch {
    // Network blip: keep tokens so a later attempt can succeed.
    return null;
  }
}

/**
 * Returns a non-expired access token, refreshing proactively when needed.
 * Returns null when the session cannot be recovered (caller should redirect to login).
 */
export async function getValidAccessToken(): Promise<string | null> {
  const token = getAccessToken();
  if (token && !isTokenExpired(token)) {
    return token;
  }
  if (getRefreshToken()) {
    return refreshAccessToken();
  }
  if (token) clearTokens();
  return null;
}

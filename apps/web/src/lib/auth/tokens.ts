const JWT_TEMPLATE = "streamora-api";

type TokenOptions = {
  skipCache?: boolean;
  reloadSession?: boolean;
};

type TokenGetter = (options?: TokenOptions) => Promise<string | null>;

let registeredGetToken: TokenGetter | null = null;

type ClerkSession = {
  getToken: (opts?: {
    template?: string;
    skipCache?: boolean;
  }) => Promise<string | null>;
  reload: () => Promise<void>;
};

type ClerkClient = {
  loaded?: boolean;
  session?: ClerkSession | null;
};

function getClerk(): ClerkClient | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as typeof window & { Clerk?: ClerkClient }).Clerk;
}

async function waitForClerkLoaded(timeoutMs = 10000): Promise<ClerkClient | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const clerk = getClerk();
    if (clerk?.loaded) return clerk;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return getClerk() ?? null;
}

async function getTokenFromClerkClient(
  options?: TokenOptions,
): Promise<string | null> {
  const clerk = await waitForClerkLoaded();
  if (!clerk?.session) return null;

  if (options?.reloadSession) {
    try {
      await clerk.session.reload();
    } catch {
      // Best-effort refresh before fetching a template token.
    }
  }

  try {
    const templateToken = await clerk.session.getToken({
      template: JWT_TEMPLATE,
      skipCache: options?.skipCache,
    });
    if (templateToken) return templateToken;
  } catch {
    // Fall through to the default session JWT.
  }

  try {
    return await clerk.session.getToken({ skipCache: options?.skipCache });
  } catch {
    return null;
  }
}

/** Registers Clerk's useAuth().getToken bridge from AuthSync. */
export function registerClerkTokenGetter(getter: TokenGetter | null) {
  registeredGetToken = getter;
}

export async function getApiToken(options?: TokenOptions): Promise<string | null> {
  if (typeof window === "undefined") return null;

  if (registeredGetToken) {
    const token = await registeredGetToken(options);
    if (token) return token;
  }

  return getTokenFromClerkClient(options);
}

/** Backward-compatible aliases used by existing components. */
export const getAccessToken = getApiToken;
export const getValidAccessToken = getApiToken;

/** @deprecated Clerk manages tokens; no-op for legacy callers. */
export function setTokens(_accessToken: string, _refreshToken?: string | null) {
  // no-op
}

/** @deprecated Use Clerk sign-out via UserButton. */
export function logout(locale = "en") {
  clearTokens();
  window.location.href = `/${locale}`;
}

export function clearTokens() {
  window.dispatchEvent(new Event("auth:expired"));
}

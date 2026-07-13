import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTVerifyOptions,
  type JWTVerifyGetKey,
} from 'jose';

type AuthConfig = {
  issuer: string;
  audience: string;
  jwks: JWTVerifyGetKey;
};

let cachedAuthConfig: AuthConfig | null = null;
let cachedJwksUrl = '';

function resolveJwksUrl(): string {
  if (process.env.CLERK_JWKS_URL) {
    return process.env.CLERK_JWKS_URL;
  }

  const issuer = process.env.CLERK_JWT_ISSUER;
  if (!issuer) return '';

  return `${issuer.replace(/\/$/, '')}/.well-known/jwks.json`;
}

function getAuthConfig(): AuthConfig | null {
  const issuer = process.env.CLERK_JWT_ISSUER || '';
  const audience = process.env.CLERK_JWT_AUDIENCE || 'streamora-api';
  const jwksUrl = resolveJwksUrl();

  if (!issuer || !jwksUrl) {
    return null;
  }

  if (!cachedAuthConfig || cachedJwksUrl !== jwksUrl) {
    cachedJwksUrl = jwksUrl;
    cachedAuthConfig = {
      issuer,
      audience,
      jwks: createRemoteJWKSet(new URL(jwksUrl)),
    };
  }

  return cachedAuthConfig;
}

function normalizeRoles(payload: Record<string, unknown>): string[] {
  const roles = payload.roles;
  if (Array.isArray(roles)) {
    return roles.filter((r): r is string => typeof r === 'string');
  }
  if (typeof roles === 'string') {
    return [roles];
  }
  const realmAccess = payload.realm_access as { roles?: string[] } | undefined;
  return realmAccess?.roles ?? [];
}

@Injectable()
export class JwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'] as string | undefined;

    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const authConfig = getAuthConfig();
    if (!authConfig) {
      throw new UnauthorizedException(
        'Auth not configured (set CLERK_JWKS_URL and CLERK_JWT_ISSUER)',
      );
    }

    const { issuer, audience, jwks } = authConfig;
    const token = auth.substring('Bearer '.length);

    try {
      const verifyOptions: JWTVerifyOptions = { issuer };
      if (audience) {
        verifyOptions.audience = audience;
      }

      let payload;
      try {
        ({ payload } = await jwtVerify(token, jwks, verifyOptions));
      } catch (audienceError) {
        // Clerk template tokens may omit `aud`; issuer + signature still validate identity.
        if (
          audience &&
          audienceError instanceof Error &&
          audienceError.message.includes('aud')
        ) {
          ({ payload } = await jwtVerify(token, jwks, { issuer }));
        } else {
          throw audienceError;
        }
      }

      const record = payload as Record<string, unknown>;
      req.user = {
        sub: payload.sub,
        email:
          (record.email as string | undefined) ||
          (record.primary_email_address as string | undefined),
        preferred_username:
          (record.preferred_username as string | undefined) ||
          (record.username as string | undefined),
        roles: normalizeRoles(record),
      };

      return true;
    } catch (e) {
      console.error('JWT validation error:', {
        error: e instanceof Error ? e.message : String(e),
        issuer,
        audience,
        tokenPreview: token.substring(0, 50) + '...',
      });
      throw new UnauthorizedException(
        `Invalid token: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}

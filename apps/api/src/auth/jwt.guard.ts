import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const issuer = process.env.KEYCLOAK_ISSUER || 'http://localhost:8080/realms/streamora';
const audience = process.env.KEYCLOAK_AUDIENCE || 'streamora-web';

// JWKS endpoint auto-derived from issuer
const jwks = createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));

@Injectable()
export class JwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'] as string | undefined;

    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const token = auth.substring('Bearer '.length);

    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer,
        audience,
      });

      // Attach user info to request
      req.user = {
        sub: payload.sub,
        email: payload.email,
        preferred_username: payload.preferred_username,
        realm_access: payload.realm_access,
      };

      return true;
    } catch (e) {
      // Log error for debugging
      console.error('JWT validation error:', {
        error: e instanceof Error ? e.message : String(e),
        issuer,
        audience,
        tokenPreview: token.substring(0, 50) + '...',
      });
      throw new UnauthorizedException(
        `Invalid token: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}

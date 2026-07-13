import { Injectable, Logger } from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';

const DEFAULT_SIGNUP_ROLES = ['CREATOR_PENDING'];

@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);
  private readonly client =
    process.env.CLERK_SECRET_KEY != null
      ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
      : null;

  /**
   * Clerk has no instance-level default publicMetadata API. New users get
   * CREATOR_PENDING on first API contact when roles are missing.
   */
  async ensureDefaultRoles(clerkUserId: string): Promise<string[]> {
    if (!this.client) {
      return DEFAULT_SIGNUP_ROLES;
    }

    const user = await this.client.users.getUser(clerkUserId);
    const current = (user.publicMetadata?.roles as string[] | undefined) ?? [];
    if (current.length > 0) {
      return current;
    }

    await this.setUserRoles(clerkUserId, DEFAULT_SIGNUP_ROLES);
    return DEFAULT_SIGNUP_ROLES;
  }

  async setUserRoles(clerkUserId: string, roles: string[]): Promise<void> {
    if (!this.client) {
      this.logger.warn(
        'CLERK_SECRET_KEY not set; skipping Clerk role sync for ' + clerkUserId,
      );
      return;
    }

    await this.client.users.updateUserMetadata(clerkUserId, {
      publicMetadata: { roles },
    });
  }

  async promoteCreatorToApproved(clerkUserId: string): Promise<void> {
    if (!this.client) return;

    const user = await this.client.users.getUser(clerkUserId);
    const current = (user.publicMetadata?.roles as string[] | undefined) ?? [];
    const withoutPending = current.filter((r) => r !== 'CREATOR_PENDING');
    const next = Array.from(new Set([...withoutPending, 'CREATOR_APPROVED']));
    await this.setUserRoles(clerkUserId, next);
  }

  async demoteCreatorToPending(clerkUserId: string): Promise<void> {
    if (!this.client) return;

    const user = await this.client.users.getUser(clerkUserId);
    const current = (user.publicMetadata?.roles as string[] | undefined) ?? [];
    const withoutApproved = current.filter((r) => r !== 'CREATOR_APPROVED');
    const next = Array.from(new Set([...withoutApproved, 'CREATOR_PENDING']));
    await this.setUserRoles(clerkUserId, next);
  }
}

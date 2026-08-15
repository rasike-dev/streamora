import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';
import { AdminTaxonomyController } from '../taxonomy/admin-taxonomy.controller';
import { AdminTagGovernanceController } from '../tags/admin-tags.controller';
import { AdminChannelsController } from '../admin/admin.channels.controller';
import { PublicTaxonomyController } from '../taxonomy/public-taxonomy.controller';
import { TagsController } from '../tags/tags.controller';

const reflector = new Reflector();

function rolesOn(target: any): string[] {
  return reflector.get<string[]>(ROLES_KEY, target) ?? [];
}

function contextFor(controller: any, roles: string[]): ExecutionContext {
  return {
    getHandler: () => controller,
    getClass: () => controller,
    switchToHttp: () => ({
      getRequest: () => ({ user: { roles } }),
    }),
  } as unknown as ExecutionContext;
}

describe('taxonomy permission matrix (AC-04, AC-07)', () => {
  it('restricts structural taxonomy administration to ADMIN', () => {
    expect(rolesOn(AdminTaxonomyController)).toEqual(['ADMIN']);
  });

  it('restricts every channel administration route to ADMIN', () => {
    // This controller guards per handler rather than per class, so each route is
    // checked individually: an unguarded one would let a contributor reshape the
    // hierarchy from the channel endpoints.
    const handlers = Object.getOwnPropertyNames(
      AdminChannelsController.prototype,
    ).filter((name) => name !== 'constructor' && name !== 'actor');

    expect(handlers).toEqual(
      expect.arrayContaining(['list', 'create', 'update', 'move']),
    );

    for (const handler of handlers) {
      expect(
        rolesOn((AdminChannelsController.prototype as any)[handler]),
      ).toEqual(['ADMIN']);
    }
  });

  it('allows MODERATOR alongside ADMIN for tag governance', () => {
    expect(rolesOn(AdminTagGovernanceController).sort()).toEqual([
      'ADMIN',
      'MODERATOR',
    ]);
  });

  it('leaves the public read controllers unguarded', () => {
    expect(rolesOn(PublicTaxonomyController)).toEqual([]);
    expect(rolesOn(TagsController)).toEqual([]);
  });
});

describe('RolesGuard enforcement (AC-04)', () => {
  const guard = new RolesGuard(reflector);

  it('blocks a contributor from the admin taxonomy routes', () => {
    expect(() =>
      guard.canActivate(contextFor(AdminTaxonomyController, ['CREATOR'])),
    ).toThrow(ForbiddenException);
  });

  it('blocks a moderator from structural taxonomy changes', () => {
    expect(() =>
      guard.canActivate(contextFor(AdminTaxonomyController, ['MODERATOR'])),
    ).toThrow(ForbiddenException);
  });

  it('admits an admin to structural taxonomy changes', () => {
    expect(
      guard.canActivate(contextFor(AdminTaxonomyController, ['ADMIN'])),
    ).toBe(true);
  });

  it('admits a moderator to tag governance', () => {
    expect(
      guard.canActivate(
        contextFor(AdminTagGovernanceController, ['MODERATOR']),
      ),
    ).toBe(true);
  });

  it('lets anyone read the public taxonomy', () => {
    expect(guard.canActivate(contextFor(PublicTaxonomyController, []))).toBe(
      true,
    );
  });
});

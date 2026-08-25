import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AdminTagGovernanceController } from './admin-tags.controller';
import { AdminTagsService } from './admin-tags.service';

describe('AdminTagGovernanceController (AC-07, AC-12)', () => {
  let app: INestApplication;
  const service = {
    list: jest.fn(),
    mergePreview: jest.fn(),
    merge: jest.fn(),
    updateStatus: jest.fn(),
    addAlias: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminTagGovernanceController],
      providers: [{ provide: AdminTagsService, useValue: service }],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    app.use((req: any, _res: any, next: () => void) => {
      req.user = { sub: 'admin-1' };
      next();
    });
    await app.init();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /admin/tags forwards list filters to the service', async () => {
    service.list.mockResolvedValue({
      pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
      items: [],
    });

    const res = await request(app.getHttpServer())
      .get('/admin/tags?q=rally&status=ACTIVE&page=2&pageSize=10')
      .expect(200);

    expect(res.body).toEqual({
      pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
      items: [],
    });

    expect(service.list).toHaveBeenCalledWith({
      q: 'rally',
      status: 'ACTIVE',
      page: 2,
      pageSize: 10,
    });
  });

  it('GET /admin/tags rejects an unknown status value', async () => {
    await request(app.getHttpServer())
      .get('/admin/tags?status=GONE')
      .expect(400);
  });

  it('GET /admin/tags/:id/merge-preview requires targetTagId', async () => {
    await request(app.getHttpServer())
      .get('/admin/tags/tag-1/merge-preview')
      .expect(400);
  });

  it('POST /admin/tags/:id/merge delegates to the service with the actor', async () => {
    service.merge.mockResolvedValue({ id: 'tag-1', status: 'MERGED' });

    await request(app.getHttpServer())
      .post('/admin/tags/tag-1/merge')
      .send({ targetTagId: 'tag-2' })
      .expect(201)
      .expect({ id: 'tag-1', status: 'MERGED' });

    expect(service.merge).toHaveBeenCalledWith('tag-1', 'tag-2', 'admin-1');
  });

  it('PATCH /admin/tags/:id/status updates moderation state', async () => {
    service.updateStatus.mockResolvedValue({ id: 'tag-1', status: 'BLOCKED' });

    await request(app.getHttpServer())
      .patch('/admin/tags/tag-1/status')
      .send({ status: 'BLOCKED' })
      .expect(200)
      .expect({ id: 'tag-1', status: 'BLOCKED' });

    expect(service.updateStatus).toHaveBeenCalledWith(
      'tag-1',
      { status: 'BLOCKED' },
      'admin-1',
    );
  });

  it('POST /admin/tags/:id/aliases creates an alias through the service', async () => {
    service.addAlias.mockResolvedValue({ alias: 'townhall' });

    await request(app.getHttpServer())
      .post('/admin/tags/tag-1/aliases')
      .send({ alias: 'townhall' })
      .expect(201)
      .expect({ alias: 'townhall' });

    expect(service.addAlias).toHaveBeenCalledWith(
      'tag-1',
      { alias: 'townhall' },
      'admin-1',
    );
  });
});

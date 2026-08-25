import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AdminTaxonomyController } from './admin-taxonomy.controller';
import { AdminTaxonomyService } from './admin-taxonomy.service';

describe('AdminTaxonomyController (AC-01, AC-04)', () => {
  let app: INestApplication;
  const service = {
    getAdminTree: jest.fn(),
    getUnmappedChannels: jest.fn(),
    getImpact: jest.fn(),
    getAuditLog: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    archiveCategory: jest.fn(),
    createSubcategory: jest.fn(),
    moveSubcategory: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminTaxonomyController],
      providers: [{ provide: AdminTaxonomyService, useValue: service }],
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

  it('GET /admin/taxonomy/tree returns the admin drill-down tree', async () => {
    service.getAdminTree.mockResolvedValue([{ slug: 'politics' }]);

    await request(app.getHttpServer())
      .get('/admin/taxonomy/tree?locale=si')
      .expect(200)
      .expect([{ slug: 'politics' }]);

    expect(service.getAdminTree).toHaveBeenCalledWith('si');
  });

  it('GET /admin/taxonomy/unmapped-channels lists legacy channels', async () => {
    service.getUnmappedChannels.mockResolvedValue([{ slug: 'technology' }]);

    await request(app.getHttpServer())
      .get('/admin/taxonomy/unmapped-channels')
      .expect(200)
      .expect([{ slug: 'technology' }]);
  });

  it('GET /admin/taxonomy/impact validates entityType', async () => {
    await request(app.getHttpServer())
      .get('/admin/taxonomy/impact?entityType=NOT_A_THING&entityId=cat-1')
      .expect(400);
  });

  it('POST /admin/categories creates a category through the service', async () => {
    service.createCategory.mockResolvedValue({
      id: 'cat-new',
      slug: 'community-engagement',
      name: 'Community Engagement',
    });

    await request(app.getHttpServer())
      .post('/admin/categories')
      .send({ name: 'Community Engagement' })
      .expect(201)
      .expect({
        id: 'cat-new',
        slug: 'community-engagement',
        name: 'Community Engagement',
      });

    expect(service.createCategory).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Community Engagement' }),
      'admin-1',
    );
  });

  it('PATCH /admin/categories/:id updates a category', async () => {
    service.updateCategory.mockResolvedValue({
      id: 'cat-1',
      slug: 'politics',
      name: 'Politics Updated',
    });

    await request(app.getHttpServer())
      .patch('/admin/categories/cat-1')
      .send({ name: 'Politics Updated' })
      .expect(200)
      .expect({
        id: 'cat-1',
        slug: 'politics',
        name: 'Politics Updated',
      });

    expect(service.updateCategory).toHaveBeenCalledWith(
      'cat-1',
      expect.objectContaining({ name: 'Politics Updated' }),
      'admin-1',
    );
  });

  it('POST /admin/subcategories creates a subcategory under a category', async () => {
    service.createSubcategory.mockResolvedValue({
      id: 'sub-new',
      slug: 'town-halls',
      name: 'Town Halls',
    });

    await request(app.getHttpServer())
      .post('/admin/subcategories')
      .send({ categoryId: 'cat-1', name: 'Town Halls' })
      .expect(201)
      .expect({ id: 'sub-new', slug: 'town-halls', name: 'Town Halls' });

    expect(service.createSubcategory).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'cat-1', name: 'Town Halls' }),
      'admin-1',
    );
  });

  it('POST /admin/subcategories/:id/move forwards the destination category', async () => {
    service.moveSubcategory.mockResolvedValue({ moved: true });

    await request(app.getHttpServer())
      .post('/admin/subcategories/sub-1/move')
      .send({ categoryId: 'cat-2' })
      .expect(201)
      .expect({ moved: true });

    expect(service.moveSubcategory).toHaveBeenCalledWith(
      'sub-1',
      'cat-2',
      'admin-1',
    );
  });
});

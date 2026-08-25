import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { PublicTaxonomyController } from './public-taxonomy.controller';
import { TaxonomyService } from './taxonomy.service';

describe('PublicTaxonomyController (AC-09)', () => {
  let app: INestApplication;
  const taxonomy = {
    getPublicTree: jest.fn(),
    getCategoryBySlug: jest.fn(),
    getSubcategoryBySlug: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PublicTaxonomyController],
      providers: [{ provide: TaxonomyService, useValue: taxonomy }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /categories forwards the locale query to the service', async () => {
    taxonomy.getPublicTree.mockResolvedValue([{ slug: 'election-campaigns' }]);

    await request(app.getHttpServer())
      .get('/categories?locale=si')
      .expect(200)
      .expect([{ slug: 'election-campaigns' }]);

    expect(taxonomy.getPublicTree).toHaveBeenCalledWith('si');
  });

  it('GET /categories/:slug returns a category detail page payload', async () => {
    taxonomy.getCategoryBySlug.mockResolvedValue({
      slug: 'election-campaigns',
      subcategories: [],
    });

    await request(app.getHttpServer())
      .get('/categories/election-campaigns?locale=ta')
      .expect(200)
      .expect({ slug: 'election-campaigns', subcategories: [] });

    expect(taxonomy.getCategoryBySlug).toHaveBeenCalledWith(
      'election-campaigns',
      'ta',
    );
  });

  it('GET /categories/:categorySlug/subcategories/:slug resolves nested slugs', async () => {
    taxonomy.getSubcategoryBySlug.mockResolvedValue({
      slug: 'presidential-elections',
      channels: [],
    });

    await request(app.getHttpServer())
      .get(
        '/categories/election-campaigns/subcategories/presidential-elections?locale=en',
      )
      .expect(200)
      .expect({ slug: 'presidential-elections', channels: [] });

    expect(taxonomy.getSubcategoryBySlug).toHaveBeenCalledWith(
      'election-campaigns',
      'presidential-elections',
      'en',
    );
  });
});

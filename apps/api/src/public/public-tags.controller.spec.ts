import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { PublicTagsController } from './public-tags.controller';
import { PublicTagsService } from './public-tags.service';

describe('PublicTagsController (AC-10)', () => {
  let app: INestApplication;
  const publicTagsService = {
    getTagBySlug: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PublicTagsController],
      providers: [{ provide: PublicTagsService, useValue: publicTagsService }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /tags/:slug forwards locale and pagination to the service', async () => {
    publicTagsService.getTagBySlug.mockResolvedValue({
      tag: { slug: 'rallies', name: 'Rallies', redirectedFrom: null },
      pagination: { page: 2, pageSize: 6, total: 1, totalPages: 1 },
      items: [],
    });

    const res = await request(app.getHttpServer())
      .get('/tags/rallies?locale=si&page=2&pageSize=6')
      .expect(200);

    expect(res.body.tag.slug).toBe('rallies');
    expect(res.body.pagination.page).toBe(2);

    expect(publicTagsService.getTagBySlug).toHaveBeenCalledWith('rallies', {
      locale: 'si',
      page: 2,
      pageSize: 6,
    });
  });
});

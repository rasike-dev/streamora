import { Controller, Get, Param, Query } from '@nestjs/common';
import { TaxonomyService } from './taxonomy.service';

@Controller()
export class PublicTaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Get('categories')
  async list(@Query('locale') locale = 'en') {
    return this.taxonomy.getPublicTree(locale);
  }

  @Get('categories/:slug')
  async category(@Param('slug') slug: string, @Query('locale') locale = 'en') {
    return this.taxonomy.getCategoryBySlug(slug, locale);
  }

  /**
   * Nested under the category because subcategory slugs are only unique within
   * their parent, so a bare /subcategories/:slug lookup would be ambiguous.
   */
  @Get('categories/:categorySlug/subcategories/:slug')
  async subcategory(
    @Param('categorySlug') categorySlug: string,
    @Param('slug') slug: string,
    @Query('locale') locale = 'en',
  ) {
    return this.taxonomy.getSubcategoryBySlug(categorySlug, slug, locale);
  }
}

import { Module } from '@nestjs/common';
import { TaxonomyService } from './taxonomy.service';
import { AdminTaxonomyService } from './admin-taxonomy.service';
import { ContentTaxonomyService } from './content-taxonomy.service';
import { AdminTaxonomyController } from './admin-taxonomy.controller';
import { PublicTaxonomyController } from './public-taxonomy.controller';

@Module({
  controllers: [PublicTaxonomyController, AdminTaxonomyController],
  providers: [TaxonomyService, AdminTaxonomyService, ContentTaxonomyService],
  exports: [TaxonomyService, AdminTaxonomyService, ContentTaxonomyService],
})
export class TaxonomyModule {}

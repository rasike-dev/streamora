import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { ExternalEmbedParserService } from './external-embed-parser.service';
import { ExternalEmbedValidatorService } from './external-embed-validator.service';
import { ExternalEmbedService } from './external-embed.service';
import { ExternalEmbedValidationScheduler } from './external-embed-validation.scheduler';
import { ExternalEmbedController } from './external-embed.controller';

@Module({
  imports: [PrismaModule, TaxonomyModule],
  controllers: [ExternalEmbedController],
  providers: [
    ExternalEmbedParserService,
    ExternalEmbedValidatorService,
    ExternalEmbedService,
    ExternalEmbedValidationScheduler,
  ],
  exports: [ExternalEmbedService],
})
export class ExternalEmbedModule {}

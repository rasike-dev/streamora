import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { CreatorVideosQueryService } from './creator-videos-query.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchModule } from '../search/search.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { TagsModule } from '../tags/tags.module';
import { ExternalEmbedModule } from '../external-embed/external-embed.module';

@Module({
  imports: [
    PrismaModule,
    SearchModule,
    TaxonomyModule,
    TagsModule,
    ExternalEmbedModule,
  ],
  controllers: [VideosController],
  providers: [VideosService, CreatorVideosQueryService],
  exports: [VideosService],
})
export class VideosModule {}

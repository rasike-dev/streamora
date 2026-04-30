import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { CreatorVideosQueryService } from './creator-videos-query.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [PrismaModule, SearchModule],
  controllers: [VideosController],
  providers: [VideosService, CreatorVideosQueryService],
  exports: [VideosService],
})
export class VideosModule {}

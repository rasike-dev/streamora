import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { CreatorVideosQueryService } from './creator-videos-query.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VideosController],
  providers: [VideosService, CreatorVideosQueryService],
  exports: [VideosService],
})
export class VideosModule {}

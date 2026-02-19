import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ChannelsModule } from './channels/channels.module';
import { TagsModule } from './tags/tags.module';
import { VideosModule } from './videos/videos.module';
import { UploadsController } from './uploads/uploads.controller';
import { UploadLimitsController } from './uploads/uploads.limits.controller';
import { UploadStatusController } from './uploads/uploads.status.controller';
import { UploadProgressController } from './uploads/uploads.progress.controller';
import { UploadCompleteController } from './uploads/uploads.complete.controller';
import { UploadFailController } from './uploads/uploads.fail.controller';
import { CreatorUploadsController } from './uploads/uploads.creator.controller';
import { UploadCompleteV2Controller } from './uploads/uploads.complete-v2.controller';
import { VideoThumbsController } from './videos/video-thumbs.controller';
import { VideosPlaybackController } from './videos/videos.playback.controller';
import { GcsService } from './storage/gcs.service';
import { PubsubService } from './events/pubsub.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env', '../../.env'], // Try root .env, then fallback
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ChannelsModule,
    TagsModule,
    VideosModule,
  ],
  controllers: [
    AppController,
    UploadsController,
    UploadLimitsController,
    UploadStatusController,
    UploadProgressController,
    UploadCompleteController,
    UploadFailController,
    CreatorUploadsController,
    UploadCompleteV2Controller,
    VideoThumbsController,
    VideosPlaybackController,
  ],
  providers: [GcsService, PubsubService],
})
export class AppModule {}

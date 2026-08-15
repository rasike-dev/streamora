import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ChannelsModule } from './channels/channels.module';
import { TagsModule } from './tags/tags.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { VideosModule } from './videos/videos.module';
import { UploadsController } from './uploads/uploads.controller';
import { UploadLimitsController } from './uploads/uploads.limits.controller';
import { UploadStatusController } from './uploads/uploads.status.controller';
import { UploadProgressController } from './uploads/uploads.progress.controller';
import { UploadFailController } from './uploads/uploads.fail.controller';
import { CreatorUploadsController } from './uploads/uploads.creator.controller';
import { UploadCompleteV2Controller } from './uploads/uploads.complete-v2.controller';
import { VideoReprocessController } from './uploads/uploads.reprocess.controller';
import { VideoThumbsController } from './videos/video-thumbs.controller';
import { CreatorVideoThumbnailsController } from './videos/video-thumbnails.controller';
import { CreatorVideoThumbnailsService } from './videos/video-thumbnails.service';
import { CreatorVideoVisibilityController } from './videos/video-visibility.controller';
import { CreatorVideoVisibilityService } from './videos/video-visibility.service';
import { CreatorVideoScheduleController } from './videos/video-schedule.controller';
import { CreatorVideoScheduleService } from './videos/video-schedule.service';
import { ScheduledPublisherService } from './videos/scheduled-publisher.service';
import { VideosPlaybackController } from './videos/videos.playback.controller';
import { PublicVideosController } from './public/public.videos.controller';
import { PublicVideoBySlugController } from './public/public.video-by-slug.controller';
import { PublicVideoShareController } from './public/public.video-share.controller';
import { PublicChannelsController } from './public/public-channels.controller';
import { PublicChannelsService } from './public/public-channels.service';
import { PublicTagsController } from './public/public-tags.controller';
import { PublicTagsService } from './public/public-tags.service';
import { PublicVideosService } from './public/public-videos.service';
import { CreatorVideosQueryService } from './videos/creator-videos-query.service';
import { PublicVideoAnalyticsController } from './public/public-video-analytics.controller';
import { PublicVideoAnalyticsService } from './public/public-video-analytics.service';
import { CreatorVideoAnalyticsController } from './videos/creator-video-analytics.controller';
import { CreatorVideoAnalyticsService } from './videos/creator-video-analytics.service';
import { CreatorAnalyticsController } from './videos/creator-analytics.controller';
import { CreatorAnalyticsService } from './videos/creator-analytics.service';
import { ShortLinksController } from './short-links/short-links.controller';
import { ShortLinksService } from './short-links/short-links.service';
import { VideoSubtitlesController } from './videos/video-subtitles.controller';
import { VideoSubtitlesService } from './videos/video-subtitles.service';
import { AdminModerationController } from './admin/admin.moderation.controller';
import { AdminGovernanceController } from './admin/admin-governance.controller';
import { AdminUsersController } from './admin/admin.users.controller';
import { AdminChannelsController } from './admin/admin.channels.controller';
import { AdminTagsController } from './admin/admin.tags.controller';
import { AdminJobsController } from './admin/admin.jobs.controller';
import { AdminSchedulerController } from './admin/admin.scheduler.controller';
import { AdminGovernanceService } from './admin/admin-governance.service';
import { SearchModule } from './search/search.module';
import { HealthController } from './health/health.controller';
import { GcsService } from './storage/gcs.service';
import { PubsubService } from './events/pubsub.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { MediaController } from './media/media.controller';
import { MediaService } from './media/media.service';
import { MediaVisibilityService } from './media/media-visibility.service';
import { MediaScheduleService } from './media/media-schedule.service';
import { AdminMediaModerationController } from './admin/admin.media-moderation.controller';
import { AdminMediaGovernanceController } from './admin/admin-media-governance.controller';
import { AdminMediaGovernanceService } from './admin/admin-media-governance.service';
import { PublicMediaController } from './public/public-media.controller';
import { PublicMediaService } from './public/public-media.service';
import { MediaShortLinksController } from './short-links/media-short-links.controller';
import { MediaShortLinksService } from './short-links/media-short-links.service';
import { rateLimitConfig } from './common/rate-limit.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env', '../../.env'], // Try root .env, then fallback
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot(rateLimitConfig),
    PrismaModule,
    AuthModule,
    ChannelsModule,
    TagsModule,
    TaxonomyModule,
    VideosModule,
    SearchModule,
  ],
  controllers: [
    AppController,
    UploadsController,
    UploadLimitsController,
    UploadStatusController,
    UploadProgressController,
    UploadFailController,
    CreatorUploadsController,
    UploadCompleteV2Controller,
    VideoReprocessController,
    VideoThumbsController,
    CreatorVideoThumbnailsController,
    CreatorVideoVisibilityController,
    CreatorVideoScheduleController,
    VideosPlaybackController,
    PublicVideosController,
    PublicVideoBySlugController,
    PublicVideoShareController,
    PublicChannelsController,
    PublicTagsController,
    PublicVideoAnalyticsController,
    CreatorVideoAnalyticsController,
    CreatorAnalyticsController,
    MediaController,
    PublicMediaController,
    MediaShortLinksController,
    ShortLinksController,
    VideoSubtitlesController,
    AdminModerationController,
    AdminMediaModerationController,
    AdminGovernanceController,
    AdminMediaGovernanceController,
    AdminUsersController,
    AdminChannelsController,
    AdminTagsController,
    AdminJobsController,
    AdminSchedulerController,
    HealthController,
  ],
  providers: [
    GcsService,
    PubsubService,
    CreatorVideoThumbnailsService,
    CreatorVideoVisibilityService,
    CreatorVideoScheduleService,
    ScheduledPublisherService,
    PublicChannelsService,
    PublicTagsService,
    PublicVideosService,
    CreatorVideosQueryService,
    PublicVideoAnalyticsService,
    CreatorVideoAnalyticsService,
    CreatorAnalyticsService,
    MediaService,
    MediaVisibilityService,
    MediaScheduleService,
    PublicMediaService,
    MediaShortLinksService,
    AdminMediaGovernanceService,
    ShortLinksService,
    AdminGovernanceService,
    VideoSubtitlesService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

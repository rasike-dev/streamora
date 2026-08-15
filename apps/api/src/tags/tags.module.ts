import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { AdminTagsService } from './admin-tags.service';
import { AdminTagGovernanceController } from './admin-tags.controller';

@Module({
  controllers: [TagsController, AdminTagGovernanceController],
  providers: [TagsService, AdminTagsService],
  exports: [TagsService, AdminTagsService],
})
export class TagsModule {}

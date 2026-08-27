import {
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ScheduledPublisherService } from '../videos/scheduled-publisher.service';
import { ExternalEmbedService } from '../external-embed/external-embed.service';

@Controller()
export class AdminSchedulerController {
  constructor(
    private readonly publisher: ScheduledPublisherService,
    private readonly externalEmbedService: ExternalEmbedService,
  ) {}

  @Post('admin/scheduler/publish-due')
  async publishDue(@Headers('x-scheduler-secret') secret?: string) {
    const expected = process.env.SCHEDULER_SECRET;
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid scheduler secret');
    }

    await this.publisher.publishDueVideos();
    return { ok: true };
  }

  @Post('admin/scheduler/revalidate-external-embeds')
  async revalidateExternalEmbeds(@Headers('x-scheduler-secret') secret?: string) {
    const expected = process.env.SCHEDULER_SECRET;
    if (!expected || secret !== expected) {
      throw new UnauthorizedException('Invalid scheduler secret');
    }

    const result = await this.externalEmbedService.revalidateDueEmbeds();
    return { ok: true, ...result };
  }
}

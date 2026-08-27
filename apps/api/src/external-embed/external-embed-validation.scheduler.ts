import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExternalEmbedService } from './external-embed.service';

@Injectable()
export class ExternalEmbedValidationScheduler {
  private readonly logger = new Logger(ExternalEmbedValidationScheduler.name);

  constructor(private readonly externalEmbedService: ExternalEmbedService) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async revalidateDueEmbedsCron() {
    if (process.env.ENABLE_INTERNAL_CRON === 'false') return;
    const result = await this.externalEmbedService.revalidateDueEmbeds();
    if (result.checked > 0) {
      this.logger.log(
        `Revalidated ${result.checked} external embed(s): active=${result.active}, unavailable=${result.unavailable}, errors=${result.errors}`,
      );
    }
  }
}

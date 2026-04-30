import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}

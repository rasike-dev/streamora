import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { withPrismaPoolParams } from './database-url.util';

/** 3 instances × 3 connections = 9; worker uses 2; fits db-g1-small (50 max). */
const API_CONNECTION_LIMIT = 3;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      datasourceUrl: withPrismaPoolParams(
        process.env.DATABASE_URL,
        API_CONNECTION_LIMIT,
      ),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

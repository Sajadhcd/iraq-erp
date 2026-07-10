import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('[Prisma] Connected to database successfully.');
    } catch (e) {
      console.warn(
        '[Prisma] Warning: Could not connect to database. Running in disconnected mode.',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

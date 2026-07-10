import { Module } from '@nestjs/common';
import { CRMService } from './crm.service';
import { CRMController } from './crm.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CRMService],
  controllers: [CRMController],
  exports: [CRMService],
})
export class CRMModule {}

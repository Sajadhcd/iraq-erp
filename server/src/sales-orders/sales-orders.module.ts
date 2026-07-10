import { Module } from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service';
import { SalesOrdersController } from './sales-orders.controller';
import { PrismaService } from '../prisma/prisma.service';
import { SalesService } from '../sales/sales.service';
import { AccountingService } from '../accounting/accounting.service';

@Module({
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService, PrismaService, SalesService, AccountingService],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}

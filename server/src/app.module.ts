import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './sales/sales.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ReportsModule } from './reports/reports.module';
import { CustomersModule } from './customers/customers.module';
import { EmployeesModule } from './employees/employees.module';
import { UsersModule } from './users/users.module';
import { SettingsModule } from './settings/settings.module';
import { AccountingModule } from './accounting/accounting.module';
import { CRMModule } from './crm/crm.module';
import { QuotationsModule } from './quotations/quotations.module';
import { SalesOrdersModule } from './sales-orders/sales-orders.module';
import { HrmsModule } from './hrms/hrms.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    InventoryModule,
    SalesModule,
    PurchasingModule,
    ExpensesModule,
    ReportsModule,
    CustomersModule,
    EmployeesModule,
    UsersModule,
    SettingsModule,
    AccountingModule,
    CRMModule,
    QuotationsModule,
    SalesOrdersModule,
    HrmsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

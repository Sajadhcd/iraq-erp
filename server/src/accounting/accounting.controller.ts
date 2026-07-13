import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  AccountingService,
  CreateAccountDto,
  CreateJournalEntryDto,
  CreateVoucherDto,
} from './accounting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';

@Controller('accounting')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // 1. Chart of Accounts
  @Post('accounts')
  @Permissions('accounting:manage')
  async createAccount(@Body() dto: CreateAccountDto) {
    return this.accountingService.createAccount(dto);
  }

  @Get('accounts')
  @Permissions('accounting:view')
  async getAccounts() {
    return this.accountingService.getAccounts();
  }

  @Get('cash-bank')
  @Permissions('accounting:view')
  async getCashAndBankAccounts() {
    return this.accountingService.getCashAndBankAccounts();
  }

  @Put('accounts/:id/status')
  @Permissions('accounting:manage')
  async toggleAccountActive(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.accountingService.toggleAccountActive(id, isActive);
  }

  // 2. Journal Entries
  @Post('journals')
  @Permissions('accounting:manage')
  async createJournalEntry(@Body() dto: CreateJournalEntryDto) {
    return this.accountingService.createJournalEntry(dto);
  }

  @Get('journals')
  @Permissions('accounting:view')
  async getJournalEntries() {
    return this.accountingService.getJournalEntries();
  }

  @Post('journals/:id/post')
  @Permissions('accounting:post')
  async postJournalEntry(@Param('id') id: string) {
    return this.accountingService.postJournalEntry(id);
  }

  // 3. Vouchers
  @Post('vouchers')
  @Permissions('accounting:manage')
  async createVoucher(@Body() dto: CreateVoucherDto) {
    return this.accountingService.createVoucher(dto);
  }

  @Get('vouchers')
  @Permissions('accounting:view')
  async getVouchers() {
    return this.accountingService.getVouchers();
  }
}

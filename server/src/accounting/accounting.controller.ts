import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  AccountingService,
  CreateAccountDto,
  CreateJournalEntryDto,
  CreateVoucherDto,
} from './accounting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // 1. Chart of Accounts
  @Post('accounts')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  async createAccount(@Body() dto: CreateAccountDto) {
    return this.accountingService.createAccount(dto);
  }

  @Get('accounts')
  async getAccounts() {
    return this.accountingService.getAccounts();
  }

  @Get('cash-bank')
  async getCashAndBankAccounts() {
    return this.accountingService.getCashAndBankAccounts();
  }

  @Put('accounts/:id/status')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  async toggleAccountActive(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.accountingService.toggleAccountActive(id, isActive);
  }

  // 2. Journal Entries
  @Post('journals')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  async createJournalEntry(@Body() dto: CreateJournalEntryDto) {
    return this.accountingService.createJournalEntry(dto);
  }

  @Get('journals')
  async getJournalEntries() {
    return this.accountingService.getJournalEntries();
  }

  @Post('journals/:id/post')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  async postJournalEntry(@Param('id') id: string) {
    return this.accountingService.postJournalEntry(id);
  }

  // 3. Vouchers
  @Post('vouchers')
  @Roles('SUPER_ADMIN', 'ACCOUNTANT')
  async createVoucher(@Body() dto: CreateVoucherDto) {
    return this.accountingService.createVoucher(dto);
  }

  @Get('vouchers')
  async getVouchers() {
    return this.accountingService.getVouchers();
  }
}

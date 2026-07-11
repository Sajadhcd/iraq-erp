import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountType, JournalStatus, VoucherType } from '@prisma/client';

export class CreateAccountDto {
  code: string;
  nameEn: string;
  nameAr: string;
  type: AccountType;
  parentId?: string;
  isCashOrBank?: boolean;
  cashBankType?: string;
  openingBalance?: number;
}

export class JournalItemDto {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export class CreateJournalEntryDto {
  date?: string;
  reference?: string;
  notes?: string;
  status?: JournalStatus;
  items: JournalItemDto[];
  createdById?: string;
}

export class CreateVoucherDto {
  type: VoucherType;
  amount: number;
  fromAccountId?: string;
  toAccountId?: string;
  reference?: string;
  notes?: string;
  createdById?: string;
}

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  // 1. Chart of Accounts
  async createAccount(dto: CreateAccountDto) {
    const existing = await this.prisma.account.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException('رمز الحساب مسجل بالفعل.');
    }

    if (dto.parentId) {
      const parent = await this.prisma.account.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('الحساب الأب المحدد غير موجود.');
      }
    }

    const opening = dto.openingBalance || 0;

    return this.prisma.account.create({
      data: {
        code: dto.code,
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        type: dto.type,
        parentId: dto.parentId || null,
        isCashOrBank: dto.isCashOrBank || false,
        cashBankType: dto.cashBankType || null,
        openingBalance: opening,
        currentBalance: opening, // Starts with opening balance
      },
    });
  }

  async getAccounts() {
    return this.prisma.account.findMany({
      where: { deletedAt: null },
      orderBy: { code: 'asc' },
    });
  }

  async getCashAndBankAccounts() {
    return this.prisma.account.findMany({
      where: {
        deletedAt: null,
        isCashOrBank: true,
        isActive: true,
      },
      orderBy: { code: 'asc' },
    });
  }

  async toggleAccountActive(id: string, isActive: boolean) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('الحساب غير موجود.');
    return this.prisma.account.update({
      where: { id },
      data: { isActive },
    });
  }

  // 2. Journal Entries
  async createJournalEntry(dto: CreateJournalEntryDto) {
    if (dto.items.length < 2) {
      throw new BadRequestException(
        'يجب أن يحتوي القيد اليومي على بندين على الأقل.',
      );
    }

    // Sum validation
    let totalDebit = 0;
    let totalCredit = 0;
    for (const item of dto.items) {
      if (item.debit < 0 || item.credit < 0) {
        throw new BadRequestException('المبالغ المدخلة لا يمكن أن تكون سالبة.');
      }
      totalDebit += item.debit;
      totalCredit += item.credit;
    }

    // Check balance (float precision safe comparison)
    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      throw new BadRequestException(
        `القيد غير متزن. المدين (${totalDebit}) يجب أن يساوي الدائن (${totalCredit}).`,
      );
    }

    const entryNumber = `JE-${Date.now().toString().slice(-8)}`;

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          entryNumber,
          date: dto.date ? new Date(dto.date) : new Date(),
          reference: dto.reference || null,
          notes: dto.notes || null,
          status: dto.status || JournalStatus.DRAFT,
          createdById: dto.createdById || null,
        },
      });

      for (const item of dto.items) {
        await tx.journalItem.create({
          data: {
            journalEntryId: entry.id,
            accountId: item.accountId,
            debit: item.debit,
            credit: item.credit,
            description: item.description || null,
          },
        });
      }

      // If created as POSTED, immediately apply balances
      if (entry.status === JournalStatus.POSTED) {
        await this.postJournalEntryTx(entry.id, tx);
      }

      return tx.journalEntry.findUnique({
        where: { id: entry.id },
        include: { items: { include: { account: true } } },
      });
    });
  }

  async getJournalEntries() {
    return this.prisma.journalEntry.findMany({
      include: {
        items: {
          include: { account: true },
        },
        createdBy: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  async postJournalEntry(id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!entry) throw new NotFoundException('القيد اليومي غير موجود.');
    if (entry.status === JournalStatus.POSTED) {
      throw new BadRequestException('القيد اليومي تم ترحيله بالفعل.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update status
      await tx.journalEntry.update({
        where: { id },
        data: { status: JournalStatus.POSTED },
      });

      // Update balances
      await this.postJournalEntryTx(id, tx);

      return { success: true };
    });
  }

  // Internal transaction helper to update balances
  private async postJournalEntryTx(entryId: string, tx: any) {
    const items = await tx.journalItem.findMany({
      where: { journalEntryId: entryId },
      include: { account: true },
    });

    for (const item of items) {
      const type = item.account.type;
      let balanceChange = 0;

      if (type === AccountType.ASSET || type === AccountType.EXPENSE) {
        balanceChange =
          parseFloat(item.debit.toString()) -
          parseFloat(item.credit.toString());
      } else if (
        type === AccountType.LIABILITY ||
        type === AccountType.EQUITY ||
        type === AccountType.REVENUE
      ) {
        balanceChange =
          parseFloat(item.credit.toString()) -
          parseFloat(item.debit.toString());
      }

      await tx.account.update({
        where: { id: item.accountId },
        data: {
          currentBalance: { increment: balanceChange },
        },
      });
    }
  }

  // 3. Vouchers
  async createVoucher(dto: CreateVoucherDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('مبلغ السند يجب أن يكون أكبر من الصفر.');
    }

    const voucherNumber = `VOU-${Date.now().toString().slice(-8)}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Create the Voucher in DRAFT/POSTED (will post automatically)
      const voucher = await tx.voucher.create({
        data: {
          voucherNumber,
          type: dto.type,
          amount: dto.amount,
          fromAccountId: dto.fromAccountId || null,
          toAccountId: dto.toAccountId || null,
          reference: dto.reference || null,
          notes: dto.notes || null,
          status: JournalStatus.POSTED, // Auto post vouchers
          createdById: dto.createdById || null,
        },
      });

      // 2. Build Journal entry items based on Voucher Type
      const journalItems: JournalItemDto[] = [];

      if (dto.type === VoucherType.RECEIPT) {
        // Receipt: Money enters toAccountId (Cash/Bank) from fromAccountId (Accounts Receivable or custom Account)
        if (!dto.toAccountId || !dto.fromAccountId) {
          throw new BadRequestException(
            'يجب اختيار حساب الاستلام وحساب الدفع.',
          );
        }
        journalItems.push({
          accountId: dto.toAccountId, // Debit Asset (Cash/Bank)
          debit: dto.amount,
          credit: 0,
          description: `سند قبض رقم ${voucherNumber}: ${dto.notes || ''}`,
        });
        journalItems.push({
          accountId: dto.fromAccountId, // Credit Source (Accounts Receivable / Income / etc.)
          debit: 0,
          credit: dto.amount,
          description: `سند قبض رقم ${voucherNumber}: ${dto.notes || ''}`,
        });
      } else if (dto.type === VoucherType.PAYMENT) {
        // Payment: Money leaves fromAccountId (Cash/Bank) to toAccountId (Accounts Payable or Expense)
        if (!dto.fromAccountId || !dto.toAccountId) {
          throw new BadRequestException('يجب اختيار حساب الدفع وحساب المستلم.');
        }
        journalItems.push({
          accountId: dto.toAccountId, // Debit Destination (Accounts Payable / Expense)
          debit: dto.amount,
          credit: 0,
          description: `سند صرف رقم ${voucherNumber}: ${dto.notes || ''}`,
        });
        journalItems.push({
          accountId: dto.fromAccountId, // Credit Asset (Cash/Bank)
          debit: 0,
          credit: dto.amount,
          description: `سند صرف رقم ${voucherNumber}: ${dto.notes || ''}`,
        });
      } else if (dto.type === VoucherType.TRANSFER) {
        // Transfer: Money leaves fromAccountId (Cash/Bank Source) enters toAccountId (Cash/Bank Target)
        if (!dto.fromAccountId || !dto.toAccountId) {
          throw new BadRequestException(
            'يجب اختيار حساب التحويل وحساب الاستلام.',
          );
        }
        journalItems.push({
          accountId: dto.toAccountId, // Debit Target Cash/Bank
          debit: dto.amount,
          credit: 0,
          description: `تحويل بنكي رقم ${voucherNumber}: ${dto.notes || ''}`,
        });
        journalItems.push({
          accountId: dto.fromAccountId, // Credit Source Cash/Bank
          debit: 0,
          credit: dto.amount,
          description: `تحويل بنكي رقم ${voucherNumber}: ${dto.notes || ''}`,
        });
      }

      // 3. Create and Post the associated Journal Entry
      const entryNumber = `JE-V-${Date.now().toString().slice(-8)}`;
      const journalEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          date: new Date(),
          reference: voucherNumber,
          referenceType: 'VOUCHER',
          referenceId: voucher.id,
          notes:
            dto.notes ||
            `Journal Entry auto-generated for voucher ${voucherNumber}`,
          status: JournalStatus.POSTED,
          createdById: dto.createdById || null,
        },
      });

      for (const item of journalItems) {
        await tx.journalItem.create({
          data: {
            journalEntryId: journalEntry.id,
            accountId: item.accountId,
            debit: item.debit,
            credit: item.credit,
            description: item.description,
          },
        });
      }
      // Post the journal immediately
      await this.postJournalEntryTx(journalEntry.id, tx);

      // Link voucher to journal entry
      const updatedVoucher = await tx.voucher.update({
        where: { id: voucher.id },
        data: { journalEntryId: journalEntry.id },
      });

      return updatedVoucher;
    });
  }

  // Dynamic system account resolver by purpose/type
  async resolveSystemAccount(
    db: any,
    purpose:
      | 'CASH'
      | 'BANK'
      | 'ACCOUNTS_RECEIVABLE'
      | 'INVENTORY_ASSET'
      | 'ACCOUNTS_PAYABLE'
      | 'TAX_PAYABLE'
      | 'SALES_REVENUE'
      | 'COGS'
      | 'INVENTORY_ADJUSTMENT',
  ): Promise<string> {
    const client = db || this.prisma;

    if (purpose === 'CASH') {
      const acc = await client.account.findFirst({
        where: {
          deletedAt: null,
          isActive: true,
          OR: [
            { isCashOrBank: true, cashBankType: 'CASH' },
            { code: '101000' },
            { type: AccountType.ASSET, nameEn: { contains: 'Cash', mode: 'insensitive' } },
            { type: AccountType.ASSET, nameAr: { contains: 'خزينة' } },
          ],
        },
      });
      if (acc) return acc.id;
      const created = await client.account.create({
        data: {
          code: '101000',
          nameEn: 'Cash on Hand',
          nameAr: 'الخزينة/النقدية بالخزينة',
          type: AccountType.ASSET,
          isCashOrBank: true,
          cashBankType: 'CASH',
          isActive: true,
        },
      });
      return created.id;
    }

    if (purpose === 'BANK') {
      const acc = await client.account.findFirst({
        where: {
          deletedAt: null,
          isActive: true,
          OR: [
            { isCashOrBank: true, cashBankType: 'BANK' },
            { code: '102000' },
            { type: AccountType.ASSET, nameEn: { contains: 'Bank', mode: 'insensitive' } },
            { type: AccountType.ASSET, nameAr: { contains: 'بنك' } },
          ],
        },
      });
      if (acc) return acc.id;
      const created = await client.account.create({
        data: {
          code: '102000',
          nameEn: 'Bank Account',
          nameAr: 'الحساب البنكي',
          type: AccountType.ASSET,
          isCashOrBank: true,
          cashBankType: 'BANK',
          isActive: true,
        },
      });
      return created.id;
    }

    if (purpose === 'INVENTORY_ASSET') {
      const acc = await client.account.findFirst({
        where: {
          deletedAt: null,
          isActive: true,
          type: AccountType.ASSET,
          OR: [
            { code: '120000' },
            { nameEn: { contains: 'Inventory', mode: 'insensitive' } },
            { nameAr: { contains: 'مخزون' } },
          ],
        },
      });
      if (acc) return acc.id;
      const created = await client.account.create({
        data: {
          code: '120000',
          nameEn: 'Inventory Asset',
          nameAr: 'مخزون السلع والبضائع',
          type: AccountType.ASSET,
          isActive: true,
        },
      });
      return created.id;
    }

    if (purpose === 'ACCOUNTS_RECEIVABLE') {
      const acc = await client.account.findFirst({
        where: {
          deletedAt: null,
          isActive: true,
          type: AccountType.ASSET,
          OR: [
            { code: '110000' },
            { nameEn: { contains: 'Receivable', mode: 'insensitive' } },
            { nameAr: { contains: 'عملاء' } },
          ],
        },
      });
      if (acc) return acc.id;
      const created = await client.account.create({
        data: {
          code: '110000',
          nameEn: 'Accounts Receivable',
          nameAr: 'ذمم عملاء مدينون',
          type: AccountType.ASSET,
          isActive: true,
        },
      });
      return created.id;
    }

    if (purpose === 'ACCOUNTS_PAYABLE') {
      const acc = await client.account.findFirst({
        where: {
          deletedAt: null,
          isActive: true,
          type: AccountType.LIABILITY,
          OR: [
            { code: '210000' },
            { nameEn: { contains: 'Payable', mode: 'insensitive' } },
            { nameAr: { contains: 'موردين' } },
          ],
        },
      });
      if (acc) return acc.id;
      const created = await client.account.create({
        data: {
          code: '210000',
          nameEn: 'Accounts Payable',
          nameAr: 'ذمم موردين دائنون',
          type: AccountType.LIABILITY,
          isActive: true,
        },
      });
      return created.id;
    }

    if (purpose === 'TAX_PAYABLE') {
      const acc = await client.account.findFirst({
        where: {
          deletedAt: null,
          isActive: true,
          type: AccountType.LIABILITY,
          OR: [
            { code: '220000' },
            { nameEn: { contains: 'Tax', mode: 'insensitive' } },
            { nameAr: { contains: 'ضريبة' } },
          ],
        },
      });
      if (acc) return acc.id;
      const created = await client.account.create({
        data: {
          code: '220000',
          nameEn: 'Tax Payable',
          nameAr: 'حساب ضريبة القيمة المضافة المستحقة',
          type: AccountType.LIABILITY,
          isActive: true,
        },
      });
      return created.id;
    }

    if (purpose === 'SALES_REVENUE') {
      const acc = await client.account.findFirst({
        where: {
          deletedAt: null,
          isActive: true,
          type: AccountType.REVENUE,
          OR: [
            { code: '401000' },
            { nameEn: { contains: 'Sales', mode: 'insensitive' } },
            { nameAr: { contains: 'مبيعات' } },
          ],
        },
      });
      if (acc) return acc.id;
      const created = await client.account.create({
        data: {
          code: '401000',
          nameEn: 'Sales Revenue',
          nameAr: 'إيرادات المبيعات',
          type: AccountType.REVENUE,
          isActive: true,
        },
      });
      return created.id;
    }

    if (purpose === 'COGS') {
      const acc = await client.account.findFirst({
        where: {
          deletedAt: null,
          isActive: true,
          type: AccountType.EXPENSE,
          OR: [
            { code: '501000' },
            { nameEn: { contains: 'COGS', mode: 'insensitive' } },
            { nameEn: { contains: 'Cost of Goods', mode: 'insensitive' } },
            { nameAr: { contains: 'تكلفة البضاعة' } },
          ],
        },
      });
      if (acc) return acc.id;
      const created = await client.account.create({
        data: {
          code: '501000',
          nameEn: 'Cost of Goods Sold (COGS)',
          nameAr: 'تكلفة البضاعة المباعة',
          type: AccountType.EXPENSE,
          isActive: true,
        },
      });
      return created.id;
    }

    if (purpose === 'INVENTORY_ADJUSTMENT') {
      const acc = await client.account.findFirst({
        where: {
          deletedAt: null,
          isActive: true,
          type: AccountType.EXPENSE,
          OR: [
            { code: '503000' },
            { nameEn: { contains: 'Adjustment', mode: 'insensitive' } },
            { nameAr: { contains: 'فروقات' } },
            { nameAr: { contains: 'تسوية' } },
          ],
        },
      });
      if (acc) return acc.id;
      const created = await client.account.create({
        data: {
          code: '503000',
          nameEn: 'Inventory Adjustment Loss/Gain',
          nameAr: 'فروقات وتعديلات المخزون',
          type: AccountType.EXPENSE,
          isActive: true,
        },
      });
      return created.id;
    }

    throw new NotFoundException(`Cannot resolve system account for purpose: ${purpose}`);
  }

  async resolveAccountByCodeOrPurpose(db: any, codeOrPurpose: string): Promise<string> {
    const client = db || this.prisma;
    const acc = await client.account.findFirst({
      where: { code: codeOrPurpose, deletedAt: null },
    });
    if (acc) return acc.id;

    const codePurposeMap: Record<string, any> = {
      '101000': 'CASH',
      '102000': 'BANK',
      '110000': 'ACCOUNTS_RECEIVABLE',
      '120000': 'INVENTORY_ASSET',
      '210000': 'ACCOUNTS_PAYABLE',
      '220000': 'TAX_PAYABLE',
      '401000': 'SALES_REVENUE',
      '501000': 'COGS',
      '503000': 'INVENTORY_ADJUSTMENT',
    };

    const mappedPurpose = codePurposeMap[codeOrPurpose];
    if (mappedPurpose) {
      return this.resolveSystemAccount(client, mappedPurpose);
    }

    const created = await client.account.create({
      data: {
        code: codeOrPurpose,
        nameEn: `Account ${codeOrPurpose}`,
        nameAr: `حساب ${codeOrPurpose}`,
        type: AccountType.EXPENSE,
        isActive: true,
      },
    });
    return created.id;
  }

  async getVouchers() {
    return this.prisma.voucher.findMany({
      include: {
        fromAccount: true,
        toAccount: true,
        createdBy: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  // 4. Core Integration Helper for automatic journal entry generation
  async autoGenerateJournal(
    params: {
      type:
        | 'SALE'
        | 'PURCHASE'
        | 'CUSTOMER_PAYMENT'
        | 'SUPPLIER_PAYMENT'
        | 'STOCK_ADJUSTMENT';
      referenceId: string;
      referenceNumber: string;
      amount: number;
      taxAmount?: number;
      paymentMethod?: string;
      cogsAmount?: number; // Needed for SALE
      items?: Array<{
        accountCode: string;
        debit: number;
        credit: number;
        description?: string;
      }>;
    },
    tx: any, // Receive the transaction context to keep it in the same transaction
  ) {
    const db = tx || this.prisma;

    const journalItems: JournalItemDto[] = [];
    let entryNotes = '';

    const entryNumber = `JE-AUTO-${Date.now().toString().slice(-6)}`;

    if (params.type === 'SALE') {
      const tax = params.taxAmount || 0;
      const net = params.amount; // total amount inclusive of tax
      const rev = net - tax;

      const cashOrBankPurpose =
        params.paymentMethod === 'CASH' ? 'CASH' : 'BANK';

      journalItems.push({
        accountId: await this.resolveSystemAccount(db, cashOrBankPurpose),
        debit: net,
        credit: 0,
        description: `فاتورة مبيعات رقم ${params.referenceNumber}`,
      });

      journalItems.push({
        accountId: await this.resolveSystemAccount(db, 'SALES_REVENUE'),
        debit: 0,
        credit: rev,
        description: `إيرادات مبيعات فاتورة رقم ${params.referenceNumber}`,
      });

      if (tax > 0) {
        journalItems.push({
          accountId: await this.resolveSystemAccount(db, 'TAX_PAYABLE'),
          debit: 0,
          credit: tax,
          description: `ضريبة مبيعات فاتورة رقم ${params.referenceNumber}`,
        });
      }

      if (params.cogsAmount && params.cogsAmount > 0) {
        journalItems.push({
          accountId: await this.resolveSystemAccount(db, 'COGS'),
          debit: params.cogsAmount,
          credit: 0,
          description: `تكلفة البضاعة المباعة فاتورة رقم ${params.referenceNumber}`,
        });
        journalItems.push({
          accountId: await this.resolveSystemAccount(db, 'INVENTORY_ASSET'),
          debit: 0,
          credit: params.cogsAmount,
          description: `تخفيض المخزون للمبيعات فاتورة رقم ${params.referenceNumber}`,
        });
      }

      entryNotes = `قيد مبيعات تلقائي للفاتورة رقم ${params.referenceNumber}`;
    } else if (params.type === 'PURCHASE') {
      const tax = params.taxAmount || 0;
      const total = params.amount;
      const invCost = total - tax;

      journalItems.push({
        accountId: await this.resolveSystemAccount(db, 'INVENTORY_ASSET'),
        debit: invCost,
        credit: 0,
        description: `شراء مخزون أمر رقم ${params.referenceNumber}`,
      });

      if (tax > 0) {
        journalItems.push({
          accountId: await this.resolveSystemAccount(db, 'TAX_PAYABLE'),
          debit: tax,
          credit: 0,
          description: `ضريبة مدخلات مشتريات أمر رقم ${params.referenceNumber}`,
        });
      }

      journalItems.push({
        accountId: await this.resolveSystemAccount(db, 'ACCOUNTS_PAYABLE'),
        debit: 0,
        credit: total,
        description: `مستحقات الموردين أمر رقم ${params.referenceNumber}`,
      });

      entryNotes = `قيد مشتريات تلقائي لأمر رقم ${params.referenceNumber}`;
    } else if (params.type === 'CUSTOMER_PAYMENT') {
      const cashOrBankPurpose =
        params.paymentMethod === 'CASH' ? 'CASH' : 'BANK';

      journalItems.push({
        accountId: await this.resolveSystemAccount(db, cashOrBankPurpose),
        debit: params.amount,
        credit: 0,
        description: `سداد عميل للفاتورة رقم ${params.referenceNumber}`,
      });

      journalItems.push({
        accountId: await this.resolveSystemAccount(db, 'ACCOUNTS_RECEIVABLE'),
        debit: 0,
        credit: params.amount,
        description: `تخفيض مستحقات عميل للفاتورة رقم ${params.referenceNumber}`,
      });

      entryNotes = `سداد تلقائي من عميل للفاتورة ${params.referenceNumber}`;
    } else if (params.type === 'SUPPLIER_PAYMENT') {
      const cashOrBankPurpose =
        params.paymentMethod === 'CASH' ? 'CASH' : 'BANK';

      journalItems.push({
        accountId: await this.resolveSystemAccount(db, 'ACCOUNTS_PAYABLE'),
        debit: params.amount,
        credit: 0,
        description: `سداد دفعة للمورد للفاتورة رقم ${params.referenceNumber}`,
      });

      journalItems.push({
        accountId: await this.resolveSystemAccount(db, cashOrBankPurpose),
        debit: 0,
        credit: params.amount,
        description: `دفع نقدية للمورد للفاتورة رقم ${params.referenceNumber}`,
      });

      entryNotes = `سداد تلقائي للمورد لأمر رقم ${params.referenceNumber}`;
    } else if (params.type === 'STOCK_ADJUSTMENT') {
      if (!params.items || params.items.length === 0) {
        const isStockIn = params.amount > 0;
        const absAmount = Math.abs(params.amount);

        if (isStockIn) {
          journalItems.push({
            accountId: await this.resolveSystemAccount(db, 'INVENTORY_ASSET'),
            debit: absAmount,
            credit: 0,
            description: `تسوية مخزون بالزيادة رقم ${params.referenceNumber}`,
          });
          journalItems.push({
            accountId: await this.resolveSystemAccount(
              db,
              'INVENTORY_ADJUSTMENT',
            ),
            debit: 0,
            credit: absAmount,
            description: `أرباح تسوية المخزون رقم ${params.referenceNumber}`,
          });
        } else {
          journalItems.push({
            accountId: await this.resolveSystemAccount(
              db,
              'INVENTORY_ADJUSTMENT',
            ),
            debit: absAmount,
            credit: 0,
            description: `خسائر تسوية المخزون رقم ${params.referenceNumber}`,
          });
          journalItems.push({
            accountId: await this.resolveSystemAccount(db, 'INVENTORY_ASSET'),
            debit: 0,
            credit: absAmount,
            description: `تسوية مخزون بالنقص رقم ${params.referenceNumber}`,
          });
        }
      } else {
        for (const item of params.items) {
          journalItems.push({
            accountId: await this.resolveAccountByCodeOrPurpose(
              db,
              item.accountCode,
            ),
            debit: item.debit,
            credit: item.credit,
            description:
              item.description || `تسوية مخزون رقم ${params.referenceNumber}`,
          });
        }
      }

      entryNotes = `قيد تسوية مخزون تلقائي رقم ${params.referenceNumber}`;
    }

    // Create the Journal Entry
    const entry = await db.journalEntry.create({
      data: {
        entryNumber,
        date: new Date(),
        reference: params.referenceNumber,
        referenceType: params.type,
        referenceId: params.referenceId,
        notes: entryNotes,
        status: JournalStatus.POSTED,
      },
    });

    for (const item of journalItems) {
      await db.journalItem.create({
        data: {
          journalEntryId: entry.id,
          accountId: item.accountId,
          debit: item.debit,
          credit: item.credit,
          description: item.description,
        },
      });
    }

    // Apply balances immediately
    await this.postJournalEntryTx(entry.id, db);

    return entry;
  }
}

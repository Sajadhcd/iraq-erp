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

    // Fetch required seeded default accounts
    const accountsList = await db.account.findMany({
      where: {
        code: {
          in: [
            '101000',
            '102000',
            '110000',
            '120000',
            '210000',
            '220000',
            '301000',
            '401000',
            '501000',
            '503000',
          ],
        },
      },
    });

    const accountsMap = new Map<string, string>(
      accountsList.map((a: any) => [a.code, a.id]),
    );
    const getAccountId = (code: string): string => {
      const id = accountsMap.get(code);
      if (!id)
        throw new NotFoundException(
          `Default account with code ${code} not found in Chart of Accounts.`,
        );
      return id;
    };

    const journalItems: JournalItemDto[] = [];
    let entryNotes = '';

    const entryNumber = `JE-AUTO-${Date.now().toString().slice(-6)}`;

    if (params.type === 'SALE') {
      const tax = params.taxAmount || 0;
      const net = params.amount; // total amount inclusive of tax
      const rev = net - tax;

      // Debit: Cash/Bank (Immediate payment) or Accounts Receivable (on credit)
      const cashOrBankCode =
        params.paymentMethod === 'CASH' ? '101000' : '102000';

      journalItems.push({
        accountId: getAccountId(cashOrBankCode),
        debit: net,
        credit: 0,
        description: `فاتورة مبيعات رقم ${params.referenceNumber}`,
      });

      // Credit: Sales Revenue
      journalItems.push({
        accountId: getAccountId('401000'),
        debit: 0,
        credit: rev,
        description: `إيرادات مبيعات فاتورة رقم ${params.referenceNumber}`,
      });

      // Credit: Tax Payable (if any)
      if (tax > 0) {
        journalItems.push({
          accountId: getAccountId('220000'),
          debit: 0,
          credit: tax,
          description: `ضريبة مبيعات فاتورة رقم ${params.referenceNumber}`,
        });
      }

      // Add COGS transaction if cogsAmount > 0
      if (params.cogsAmount && params.cogsAmount > 0) {
        journalItems.push({
          accountId: getAccountId('501000'), // Debit COGS Expense
          debit: params.cogsAmount,
          credit: 0,
          description: `تكلفة البضاعة المباعة فاتورة رقم ${params.referenceNumber}`,
        });
        journalItems.push({
          accountId: getAccountId('120000'), // Credit Inventory Asset
          debit: 0,
          credit: params.cogsAmount,
          description: `تخفيض المخزون للمبيعات فاتورة رقم ${params.referenceNumber}`,
        });
      }

      entryNotes = `قيد مبيعات تلقائي للفاتورة رقم ${params.referenceNumber}`;
    } else if (params.type === 'PURCHASE') {
      const tax = params.taxAmount || 0;
      const total = params.amount; // Inclusive of tax
      const invCost = total - tax;

      // Debit: Inventory Asset (120000)
      journalItems.push({
        accountId: getAccountId('120000'),
        debit: invCost,
        credit: 0,
        description: `شراء مخزون أمر رقم ${params.referenceNumber}`,
      });

      // Debit: Tax Payable Input VAT (220000)
      if (tax > 0) {
        journalItems.push({
          accountId: getAccountId('220000'),
          debit: tax,
          credit: 0,
          description: `ضريبة مدخلات مشتريات أمر رقم ${params.referenceNumber}`,
        });
      }

      // Credit: Accounts Payable (210000)
      journalItems.push({
        accountId: getAccountId('210000'),
        debit: 0,
        credit: total,
        description: `مستحقات الموردين أمر رقم ${params.referenceNumber}`,
      });

      entryNotes = `قيد مشتريات تلقائي لأمر رقم ${params.referenceNumber}`;
    } else if (params.type === 'CUSTOMER_PAYMENT') {
      // Customer payment logs: Debit Cash/Bank, Credit Accounts Receivable
      const cashOrBankCode =
        params.paymentMethod === 'CASH' ? '101000' : '102000';

      journalItems.push({
        accountId: getAccountId(cashOrBankCode),
        debit: params.amount,
        credit: 0,
        description: `سداد عميل للفاتورة رقم ${params.referenceNumber}`,
      });

      journalItems.push({
        accountId: getAccountId('110000'), // Accounts Receivable
        debit: 0,
        credit: params.amount,
        description: `تخفيض مستحقات عميل للفاتورة رقم ${params.referenceNumber}`,
      });

      entryNotes = `سداد تلقائي من عميل للفاتورة ${params.referenceNumber}`;
    } else if (params.type === 'SUPPLIER_PAYMENT') {
      // Supplier payment logs: Debit Accounts Payable, Credit Cash/Bank
      const cashOrBankCode =
        params.paymentMethod === 'CASH' ? '101000' : '102000';

      journalItems.push({
        accountId: getAccountId('210000'), // Accounts Payable
        debit: params.amount,
        credit: 0,
        description: `سداد دفعة للمورد للفاتورة رقم ${params.referenceNumber}`,
      });

      journalItems.push({
        accountId: getAccountId(cashOrBankCode),
        debit: 0,
        credit: params.amount,
        description: `دفع نقدية للمورد للفاتورة رقم ${params.referenceNumber}`,
      });

      entryNotes = `سداد تلقائي للمورد لأمر رقم ${params.referenceNumber}`;
    } else if (params.type === 'STOCK_ADJUSTMENT') {
      // Stock Adjustment: Debit/Credit Inventory vs Inventory Adjustment Expense
      if (!params.items || params.items.length === 0) {
        // Fallback default stock adjustment
        const isStockIn = params.amount > 0;
        const absAmount = Math.abs(params.amount);

        if (isStockIn) {
          // Stock In: Debit Inventory (120000), Credit Inventory Gain (503000)
          journalItems.push({
            accountId: getAccountId('120000'),
            debit: absAmount,
            credit: 0,
            description: `تسوية مخزون بالزيادة رقم ${params.referenceNumber}`,
          });
          journalItems.push({
            accountId: getAccountId('503000'),
            debit: 0,
            credit: absAmount,
            description: `أرباح تسوية المخزون رقم ${params.referenceNumber}`,
          });
        } else {
          // Stock Out: Debit Inventory Loss (503000), Credit Inventory (120000)
          journalItems.push({
            accountId: getAccountId('503000'),
            debit: absAmount,
            credit: 0,
            description: `خسائر تسوية المخزون رقم ${params.referenceNumber}`,
          });
          journalItems.push({
            accountId: getAccountId('120000'),
            debit: 0,
            credit: absAmount,
            description: `تسوية مخزون بالنقص رقم ${params.referenceNumber}`,
          });
        }
      } else {
        // Custom items provided
        for (const item of params.items) {
          journalItems.push({
            accountId: getAccountId(item.accountCode),
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

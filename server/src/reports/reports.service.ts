import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountType, JournalStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // 1. Dashboard summary (original service method kept for backward compatibility)
  async getFinancialSummary() {
    const salesAggregate = await this.prisma.sale.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { netAmount: true, taxAmount: true },
    });

    const purchasesAggregate = await this.prisma.purchase.aggregate({
      where: { status: 'RECEIVED' },
      _sum: { totalAmount: true, taxAmount: true },
    });

    const expensesAggregate = await this.prisma.expense.aggregate({
      _sum: { amount: true, taxAmount: true },
    });

    const revenue = salesAggregate._sum.netAmount?.toNumber() || 0;
    const salesTax = salesAggregate._sum.taxAmount?.toNumber() || 0;
    const costOfGoods = purchasesAggregate._sum.totalAmount?.toNumber() || 0;
    const purchasesTax = purchasesAggregate._sum.taxAmount?.toNumber() || 0;
    const opExpenses = expensesAggregate._sum.amount?.toNumber() || 0;
    const expensesTax = expensesAggregate._sum.taxAmount?.toNumber() || 0;

    const netProfit = revenue - costOfGoods - opExpenses;
    const totalInputVat = purchasesTax + expensesTax;
    const netVatPayable = salesTax - totalInputVat;

    return {
      revenue,
      expenses: costOfGoods + opExpenses,
      netProfit,
      vatReport: {
        outputVat: salesTax,
        inputVat: totalInputVat,
        netVatPayable,
      },
    };
  }

  // 2. Trial Balance
  async getTrialBalance(startDate?: string, endDate?: string) {
    const accounts = await this.prisma.account.findMany({
      where: { deletedAt: null },
      orderBy: { code: 'asc' },
    });

    const result = [];
    let totalDebitSum = 0;
    let totalCreditSum = 0;

    for (const acc of accounts) {
      // Calculate movements within the range (optional)
      const moveWhere: any = {
        accountId: acc.id,
        journalEntry: { status: JournalStatus.POSTED },
      };
      if (startDate || endDate) {
        moveWhere.journalEntry.date = {};
        if (startDate) moveWhere.journalEntry.date.gte = new Date(startDate);
        if (endDate) moveWhere.journalEntry.date.lte = new Date(endDate);
      }

      const movements = await this.prisma.journalItem.aggregate({
        where: moveWhere,
        _sum: { debit: true, credit: true },
      });

      const debitMove = movements._sum.debit?.toNumber() || 0;
      const creditMove = movements._sum.credit?.toNumber() || 0;

      // Calculate cumulative ending balance up to endDate
      const endWhere: any = {
        accountId: acc.id,
        journalEntry: { status: JournalStatus.POSTED },
      };
      if (endDate) {
        endWhere.journalEntry.date = { lte: new Date(endDate) };
      }

      const cumulative = await this.prisma.journalItem.aggregate({
        where: endWhere,
        _sum: { debit: true, credit: true },
      });

      const cumDebit = cumulative._sum.debit?.toNumber() || 0;
      const cumCredit = cumulative._sum.credit?.toNumber() || 0;

      let endingDebit = 0;
      let endingCredit = 0;

      const opening = parseFloat(acc.openingBalance.toString());

      if (acc.type === AccountType.ASSET || acc.type === AccountType.EXPENSE) {
        const net = opening + cumDebit - cumCredit;
        if (net >= 0) endingDebit = net;
        else endingCredit = Math.abs(net);
      } else {
        const net = opening + cumCredit - cumDebit;
        if (net >= 0) endingCredit = net;
        else endingDebit = Math.abs(net);
      }

      totalDebitSum += endingDebit;
      totalCreditSum += endingCredit;

      result.push({
        id: acc.id,
        code: acc.code,
        nameEn: acc.nameEn,
        nameAr: acc.nameAr,
        type: acc.type,
        debitMovement: debitMove,
        creditMovement: creditMove,
        endingDebit,
        endingCredit,
      });
    }

    return {
      accounts: result,
      totalDebit: totalDebitSum,
      totalCredit: totalCreditSum,
    };
  }

  // 3. Profit & Loss Statement
  async getProfitLoss(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date('2000-01-01');
    const end = endDate ? new Date(endDate) : new Date('2099-12-31');

    // Fetch all POSTED journal items within the period
    const items = await this.prisma.journalItem.findMany({
      where: {
        journalEntry: {
          status: JournalStatus.POSTED,
          date: { gte: start, lte: end },
        },
      },
      include: { account: true },
    });

    let revenue = 0;
    let cogs = 0;
    const expensesMap = new Map<
      string,
      { nameEn: string; nameAr: string; amount: number }
    >();

    for (const item of items) {
      const type = item.account.type;
      const debit = parseFloat(item.debit.toString());
      const credit = parseFloat(item.credit.toString());

      if (type === AccountType.REVENUE) {
        // Revenue increases with credit
        revenue += credit - debit;
      } else if (type === AccountType.EXPENSE) {
        if (
          item.account.code === '501000' ||
          item.account.nameEn.toLowerCase().includes('cost of goods') ||
          item.account.nameEn.toLowerCase().includes('cogs') ||
          item.account.nameAr.includes('تكلفة البضاعة')
        ) {
          // COGS
          cogs += debit - credit;
        } else {
          // General Expenses
          const current = expensesMap.get(item.account.code) || {
            nameEn: item.account.nameEn,
            nameAr: item.account.nameAr,
            amount: 0,
          };
          current.amount += debit - credit;
          expensesMap.set(item.account.code, current);
        }
      }
    }

    const expensesList = Array.from(expensesMap.entries()).map(
      ([code, value]) => ({
        code,
        nameEn: value.nameEn,
        nameAr: value.nameAr,
        amount: value.amount,
      }),
    );

    const totalExpenses = expensesList.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    return {
      revenue,
      cogs,
      grossProfit,
      expenses: expensesList,
      totalExpenses,
      netProfit,
    };
  }

  // 4. Balance Sheet
  async getBalanceSheet(dateString?: string) {
    const end = dateString ? new Date(dateString) : new Date();

    const accounts = await this.prisma.account.findMany({
      where: { deletedAt: null },
      orderBy: { code: 'asc' },
    });

    const assets = [];
    const liabilities = [];
    const equity = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquityExcludingPL = 0;

    for (const acc of accounts) {
      // Calculate cumulative up to end date
      const itemsSum = await this.prisma.journalItem.aggregate({
        where: {
          accountId: acc.id,
          journalEntry: {
            status: JournalStatus.POSTED,
            date: { lte: end },
          },
        },
        _sum: { debit: true, credit: true },
      });

      const debits = itemsSum._sum.debit?.toNumber() || 0;
      const credits = itemsSum._sum.credit?.toNumber() || 0;
      const opening = parseFloat(acc.openingBalance.toString());

      if (acc.type === AccountType.ASSET) {
        const balance = opening + debits - credits;
        if (balance !== 0) {
          assets.push({
            code: acc.code,
            nameEn: acc.nameEn,
            nameAr: acc.nameAr,
            balance,
          });
          totalAssets += balance;
        }
      } else if (acc.type === AccountType.LIABILITY) {
        const balance = opening + credits - debits;
        if (balance !== 0) {
          liabilities.push({
            code: acc.code,
            nameEn: acc.nameEn,
            nameAr: acc.nameAr,
            balance,
          });
          totalLiabilities += balance;
        }
      } else if (acc.type === AccountType.EQUITY) {
        const balance = opening + credits - debits;
        equity.push({
          code: acc.code,
          nameEn: acc.nameEn,
          nameAr: acc.nameAr,
          balance,
        });
        totalEquityExcludingPL += balance;
      }
    }

    // Dynamic Profit & Loss calculation up to the Balance Sheet date
    const plSummary = await this.getProfitLoss(undefined, end.toISOString());
    const periodNetProfit = plSummary.netProfit;

    // Retained Earnings / Net Income line item added to Equity
    equity.push({
      code: '399999',
      nameEn: 'Net Income / Retained Earnings (Period)',
      nameAr: 'صافي الدخل / الأرباح المحتجزة (الفترة)',
      balance: periodNetProfit,
    });

    const totalEquity = totalEquityExcludingPL + periodNetProfit;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    return {
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      equity,
      totalEquity,
      totalLiabilitiesAndEquity,
    };
  }

  // 5. Customer Statement
  async getCustomerStatement(
    customerId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new NotFoundException('العميل غير موجود.');

    const start = startDate ? new Date(startDate) : new Date('2000-01-01');
    const end = endDate ? new Date(endDate) : new Date('2099-12-31');

    // Fetch opening balance (all sales minus all payments before startDate)
    const prevSales = await this.prisma.sale.aggregate({
      where: {
        customerId,
        status: 'COMPLETED',
        createdAt: { lt: start },
      },
      _sum: { netAmount: true },
    });

    const prevPayments = await this.prisma.payment.aggregate({
      where: {
        sale: { customerId },
        status: 'COMPLETED',
        paymentDate: { lt: start },
      },
      _sum: { amount: true },
    });

    const openingBalance =
      (prevSales._sum.netAmount?.toNumber() || 0) -
      (prevPayments._sum.amount?.toNumber() || 0);

    // Fetch sales in period
    const sales = await this.prisma.sale.findMany({
      where: {
        customerId,
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch payments in period
    const payments = await this.prisma.payment.findMany({
      where: {
        sale: { customerId },
        status: 'COMPLETED',
        paymentDate: { gte: start, lte: end },
      },
      orderBy: { paymentDate: 'asc' },
    });

    // Merge transactions sorted by date
    const transactions = [];

    for (const sale of sales) {
      transactions.push({
        date: sale.createdAt,
        type: 'INVOICE',
        reference: sale.invoiceNumber,
        debit: parseFloat(sale.netAmount.toString()),
        credit: 0,
        notes: 'فاتورة مبيعات',
      });
    }

    for (const p of payments) {
      transactions.push({
        date: p.paymentDate,
        type: 'PAYMENT',
        reference: p.transactionReference || 'PAY',
        debit: 0,
        credit: parseFloat(p.amount.toString()),
        notes: `دفعة مستلمة (${p.method})`,
      });
    }

    transactions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Compute running balances
    let runningBalance = openingBalance;
    const ledger = transactions.map((t) => {
      runningBalance = runningBalance + t.debit - t.credit;
      return { ...t, runningBalance };
    });

    return {
      customer,
      openingBalance,
      transactions: ledger,
      closingBalance: runningBalance,
    };
  }

  // 6. Supplier Statement
  async getSupplierStatement(
    supplierId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!supplier) throw new NotFoundException('المورد غير موجود.');

    const start = startDate ? new Date(startDate) : new Date('2000-01-01');
    const end = endDate ? new Date(endDate) : new Date('2099-12-31');

    // Fetch opening balance (purchases minus payments before startDate)
    const prevPurchases = await this.prisma.purchase.aggregate({
      where: {
        supplierId,
        status: 'RECEIVED',
        createdAt: { lt: start },
      },
      _sum: { totalAmount: true },
    });

    const prevPayments = await this.prisma.payment.aggregate({
      where: {
        purchase: { supplierId },
        status: 'COMPLETED',
        paymentDate: { lt: start },
      },
      _sum: { amount: true },
    });

    const openingBalance =
      (prevPurchases._sum.totalAmount?.toNumber() || 0) -
      (prevPayments._sum.amount?.toNumber() || 0);

    // Fetch purchases in period
    const purchases = await this.prisma.purchase.findMany({
      where: {
        supplierId,
        status: 'RECEIVED',
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch payments in period
    const payments = await this.prisma.payment.findMany({
      where: {
        purchase: { supplierId },
        status: 'COMPLETED',
        paymentDate: { gte: start, lte: end },
      },
      orderBy: { paymentDate: 'asc' },
    });

    const transactions = [];

    for (const pur of purchases) {
      transactions.push({
        date: pur.createdAt,
        type: 'PURCHASE',
        reference: pur.purchaseNumber,
        debit: 0,
        credit: parseFloat(pur.totalAmount.toString()),
        notes: 'فاتورة مشتريات مستلمة',
      });
    }

    for (const p of payments) {
      transactions.push({
        date: p.paymentDate,
        type: 'PAYMENT',
        reference: p.transactionReference || 'PAY',
        debit: parseFloat(p.amount.toString()),
        credit: 0,
        notes: `سداد دفعة للمورد (${p.method})`,
      });
    }

    transactions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    let runningBalance = openingBalance;
    const ledger = transactions.map((t) => {
      runningBalance = runningBalance + t.credit - t.debit; // Credit (Purchases) increases outstanding, Debit (Payments) decreases it
      return { ...t, runningBalance };
    });

    return {
      supplier,
      openingBalance,
      transactions: ledger,
      closingBalance: runningBalance,
    };
  }

  // 7. General Ledgers (for Cash and Bank)
  async getAccountLedger(
    accountId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account) throw new NotFoundException('الحساب غير موجود.');

    const start = startDate ? new Date(startDate) : new Date('2000-01-01');
    const end = endDate ? new Date(endDate) : new Date('2099-12-31');

    // 1. Calculate opening balance (all items before startDate)
    const prevItemsSum = await this.prisma.journalItem.aggregate({
      where: {
        accountId,
        journalEntry: {
          status: JournalStatus.POSTED,
          date: { lt: start },
        },
      },
      _sum: { debit: true, credit: true },
    });

    const prevDebits = prevItemsSum._sum.debit?.toNumber() || 0;
    const prevCredits = prevItemsSum._sum.credit?.toNumber() || 0;
    const opening = parseFloat(account.openingBalance.toString());

    let openingBalance = 0;
    if (
      account.type === AccountType.ASSET ||
      account.type === AccountType.EXPENSE
    ) {
      openingBalance = opening + prevDebits - prevCredits;
    } else {
      openingBalance = opening + prevCredits - prevDebits;
    }

    // 2. Fetch ledger details in range
    const items = await this.prisma.journalItem.findMany({
      where: {
        accountId,
        journalEntry: {
          status: JournalStatus.POSTED,
          date: { gte: start, lte: end },
        },
      },
      include: { journalEntry: true },
      orderBy: { journalEntry: { date: 'asc' } },
    });

    let runningBalance = openingBalance;
    const transactions = items.map((item) => {
      const d = parseFloat(item.debit.toString());
      const c = parseFloat(item.credit.toString());

      if (
        account.type === AccountType.ASSET ||
        account.type === AccountType.EXPENSE
      ) {
        runningBalance = runningBalance + d - c;
      } else {
        runningBalance = runningBalance + c - d;
      }

      return {
        date: item.journalEntry.date,
        entryNumber: item.journalEntry.entryNumber,
        reference: item.journalEntry.reference,
        notes: item.journalEntry.notes,
        description: item.description,
        debit: d,
        credit: c,
        runningBalance,
      };
    });

    return {
      account,
      openingBalance,
      transactions,
      closingBalance: runningBalance,
    };
  }
}

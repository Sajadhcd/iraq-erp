import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getFinancialSummary() {
    // 1. Sales Revenue
    const salesAggregate = await this.prisma.sale.aggregate({
      where: { status: "COMPLETED" },
      _sum: {
        netAmount: true,
        taxAmount: true,
      },
    });

    // 2. Purchase Cost
    const purchasesAggregate = await this.prisma.purchase.aggregate({
      where: { status: "RECEIVED" },
      _sum: {
        totalAmount: true,
        taxAmount: true,
      },
    });

    // 3. Operating Expenses
    const expensesAggregate = await this.prisma.expense.aggregate({
      _sum: {
        amount: true,
        taxAmount: true,
      },
    });

    const revenue = salesAggregate._sum.netAmount?.toNumber() || 0;
    const salesTax = salesAggregate._sum.taxAmount?.toNumber() || 0;

    const costOfGoods = purchasesAggregate._sum.totalAmount?.toNumber() || 0;
    const purchasesTax = purchasesAggregate._sum.taxAmount?.toNumber() || 0;

    const opExpenses = expensesAggregate._sum.amount?.toNumber() || 0;
    const expensesTax = expensesAggregate._sum.taxAmount?.toNumber() || 0;

    const netProfit = revenue - costOfGoods - opExpenses;
    
    // VAT Payable = Output VAT (Sales) - Input VAT (Purchases + Expenses)
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
}

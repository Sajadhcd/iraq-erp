import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async createExpense(data: {
    category: string;
    amount: number;
    supplierId?: string;
    warehouseId?: string;
  }) {
    const expenseNumber = `EXP-${Date.now().toString().slice(-8)}`;
    const taxAmount = data.amount * 0.15; // 15% VAT KSA

    return this.prisma.expense.create({
      data: {
        expenseNumber,
        category: data.category,
        amount: data.amount,
        taxAmount: taxAmount,
        expenseDate: new Date(),
        supplierId: data.supplierId || null,
        warehouseId: data.warehouseId || null,
      },
    });
  }

  async getExpenses() {
    return this.prisma.expense.findMany({
      include: {
        supplier: true,
        warehouse: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

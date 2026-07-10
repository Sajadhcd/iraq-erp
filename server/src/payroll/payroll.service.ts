import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // SALARY STRUCTURE CRUD
  // ==========================================
  async getSalaryStructures() {
    return this.prisma.salaryStructure.findMany({
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSalaryStructureByEmployee(employeeId: string) {
    const struct = await this.prisma.salaryStructure.findUnique({
      where: { employeeId },
      include: { employee: true },
    });
    if (!struct) {
      throw new NotFoundException('هيكل الراتب للموظف غير موجود.');
    }
    return struct;
  }

  async upsertSalaryStructure(dto: any) {
    if (!dto.employeeId || dto.basicSalary === undefined) {
      throw new BadRequestException('معرف الموظف والراتب الأساسي مطلوبان.');
    }
    return this.prisma.salaryStructure.upsert({
      where: { employeeId: dto.employeeId },
      update: {
        basicSalary: Number(dto.basicSalary),
        housing: Number(dto.housing || 0),
        transportation: Number(dto.transportation || 0),
        food: Number(dto.food || 0),
        risk: Number(dto.risk || 0),
        otherAllowances: Number(dto.otherAllowances || 0),
        taxPct: Number(dto.taxPct || 0),
        insurance: Number(dto.insurance || 0),
        active: dto.active !== undefined ? dto.active : true,
      },
      create: {
        employeeId: dto.employeeId,
        basicSalary: Number(dto.basicSalary),
        housing: Number(dto.housing || 0),
        transportation: Number(dto.transportation || 0),
        food: Number(dto.food || 0),
        risk: Number(dto.risk || 0),
        otherAllowances: Number(dto.otherAllowances || 0),
        taxPct: Number(dto.taxPct || 0),
        insurance: Number(dto.insurance || 0),
        active: dto.active !== undefined ? dto.active : true,
      },
    });
  }

  // ==========================================
  // PAYROLL PERIODS
  // ==========================================
  async getPayrollPeriods() {
    return this.prisma.payrollPeriod.findMany({
      orderBy: { code: 'desc' },
    });
  }

  async createPayrollPeriod(dto: any) {
    if (!dto.code || !dto.nameAr || !dto.nameEn || !dto.startDate || !dto.endDate) {
      throw new BadRequestException('البيانات الأساسية لدورة الرواتب ناقصة.');
    }
    const existing = await this.prisma.payrollPeriod.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException('دورة الرواتب موجودة بالفعل بهذا الرمز.');
    }
    return this.prisma.payrollPeriod.create({
      data: {
        code: dto.code,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: 'OPEN',
      },
    });
  }

  // ==========================================
  // PAYROLL RUNS
  // ==========================================
  async getPayrollRuns() {
    return this.prisma.payrollRun.findMany({
      include: {
        payrollPeriod: true,
        items: { include: { employee: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPayrollRunById(id: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: {
        payrollPeriod: true,
        items: {
          include: {
            employee: true,
            allowances: true,
            deductions: true,
          },
        },
      },
    });
    if (!run) throw new NotFoundException('عملية تشغيل الرواتب غير موجودة.');
    return run;
  }

  async createPayrollRun(periodId: string, currentUserId?: string) {
    const period = await this.prisma.payrollPeriod.findUnique({
      where: { id: periodId },
    });
    if (!period) throw new NotFoundException('فترة الرواتب المحددة غير موجودة.');

    // 1. Prevent duplicate payroll run
    const existingRun = await this.prisma.payrollRun.findFirst({
      where: { payrollPeriodId: periodId },
    });
    if (existingRun) {
      throw new BadRequestException('تم تشغيل الرواتب بالفعل لهذه الفترة.');
    }

    const employees = await this.prisma.employee.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      include: { salaryStructure: true },
    });

    const start = new Date(period.startDate);
    const end = new Date(period.endDate);

    let totalGross = 0;
    let totalAllowances = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    const runItemsData: any[] = [];

    for (const emp of employees) {
      const struct = emp.salaryStructure;
      const basic = Number(struct?.basicSalary || 0);
      const housing = Number(struct?.housing || 0);
      const transportation = Number(struct?.transportation || 0);
      const food = Number(struct?.food || 0);
      const risk = Number(struct?.risk || 0);
      const otherAllow = Number(struct?.otherAllowances || 0);
      const taxPct = Number(struct?.taxPct || 0);
      const insurance = Number(struct?.insurance || 0);

      // Import Attendance Metrics
      const attendances = await this.prisma.attendance.findMany({
        where: {
          employeeId: emp.id,
          attendanceDate: { gte: start, lte: end },
        },
      });

      const workingHours = attendances.reduce((acc, curr) => acc + Number(curr.workHours), 0);
      const overtimeHours = attendances.reduce((acc, curr) => acc + Number(curr.overtimeHours), 0);
      const lateMinutes = attendances.reduce((acc, curr) => acc + curr.lateMinutes, 0);
      const absentDays = attendances.filter((a) => a.status === 'ABSENT').length;
      const leaveDays = attendances.filter((a) => a.status === 'LEAVE').length;

      // Rate formulas: basic / 30 / 8 = Hourly rate
      const dayRate = basic / 30;
      const hourRate = dayRate / 8;
      const minRate = hourRate / 60;

      // Calculations
      const overtimePay = Number((hourRate * overtimeHours * 1.5).toFixed(2));
      const lateDeduction = Number((minRate * lateMinutes).toFixed(2));
      const absentDeduction = Number((dayRate * absentDays).toFixed(2));

      const gross = basic + housing + transportation + food + risk + overtimePay + otherAllow;
      const taxDeduction = Number((gross * (taxPct / 100)).toFixed(2));
      const totalEmpAllowances = housing + transportation + food + risk + overtimePay + otherAllow;
      const totalEmpDeductions = taxDeduction + insurance + lateDeduction + absentDeduction;
      const net = gross - totalEmpDeductions;

      totalGross += gross;
      totalAllowances += totalEmpAllowances;
      totalDeductions += totalEmpDeductions;
      totalNet += net;

      runItemsData.push({
        employeeId: emp.id,
        basicSalary: basic,
        housing,
        transportation,
        food,
        risk,
        otherAllowances: otherAllow,
        overtimePay,
        taxDeduction,
        insuranceDeduction: insurance,
        lateDeduction,
        absentDeduction,
        grossSalary: gross,
        totalAllowances: totalEmpAllowances,
        totalDeductions: totalEmpDeductions,
        netSalary: net,
        workingHours,
        lateMinutes,
        overtimeHours,
        absentDays,
        leaveDays,
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.create({
        data: {
          payrollPeriodId: periodId,
          status: 'DRAFT',
          totalGross,
          totalAllowances,
          totalDeductions,
          totalNet,
        },
      });

      for (const item of runItemsData) {
        await tx.payrollItem.create({
          data: {
            payrollRunId: run.id,
            ...item,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'PAYROLL_CREATED',
          entityName: 'PayrollRun',
          entityId: run.id,
          userId: currentUserId || null,
          newValues: run as any,
        },
      });

      return run;
    });
  }

  async approvePayrollRun(id: string, currentUserId?: string) {
    const run = await this.prisma.payrollRun.findUnique({ where: { id } });
    if (!run) throw new NotFoundException('تشغيل الرواتب غير موجود.');
    if (run.status !== 'DRAFT') {
      throw new BadRequestException('يمكن اعتماد الرواتب المسودة فقط.');
    }

    const updated = await this.prisma.payrollRun.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'PAYROLL_APPROVED',
        entityName: 'PayrollRun',
        entityId: id,
        userId: currentUserId || null,
        newValues: updated as any,
      },
    });

    return updated;
  }

  async lockPayrollRun(id: string, currentUserId?: string) {
    const run = await this.prisma.payrollRun.findUnique({
      where: { id },
      include: { items: true, payrollPeriod: true },
    });
    if (!run) throw new NotFoundException('تشغيل الرواتب غير موجود.');
    if (run.status !== 'APPROVED') {
      throw new BadRequestException('يمكن قفل الرواتب المعتمدة فقط.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Helper to find/create account
      const getOrCreateAccount = async (code: string, type: any, nameAr: string, nameEn: string) => {
        let acc = await tx.account.findUnique({ where: { code } });
        if (!acc) {
          acc = await tx.account.create({
            data: {
              code,
              type,
              nameAr,
              nameEn,
              openingBalance: 0,
              currentBalance: 0,
            },
          });
        }
        return acc;
      };

      const salaryExpenseAcc = await getOrCreateAccount('5001', 'EXPENSE', 'مصروف الرواتب', 'Salary Expense');
      const payrollPayableAcc = await getOrCreateAccount('2003', 'LIABILITY', 'رواتب مستحقة الدفع', 'Payroll Payable');
      const deductionsPayableAcc = await getOrCreateAccount('2004', 'LIABILITY', 'اقتطاعات رواتب مستحقة', 'Deductions Payable');

      // 2. Generate Journal Entry (Status = POSTED)
      const entryNumber = `JE-PAY-${Date.now().toString().slice(-6)}`;
      const totalGrossVal = Number(run.totalGross);
      const totalNetVal = Number(run.totalNet);
      const totalDeductionsVal = Number(run.totalDeductions);

      const entry = await tx.journalEntry.create({
        data: {
          entryNumber,
          date: new Date(),
          reference: `PAYROLL-${run.payrollPeriod.code}`,
          notes: `قيد تسوية رواتب الدورة: ${run.payrollPeriod.nameAr} - ${run.payrollPeriod.nameEn}`,
          status: 'POSTED',
          createdById: currentUserId || null,
        },
      });

      // Debit Expense
      await tx.journalItem.create({
        data: {
          journalEntryId: entry.id,
          accountId: salaryExpenseAcc.id,
          debit: totalGrossVal,
          credit: 0,
          description: 'إجمالي مصروفات الرواتب والأجور',
        },
      });

      // Credit Payable Net
      await tx.journalItem.create({
        data: {
          journalEntryId: entry.id,
          accountId: payrollPayableAcc.id,
          debit: 0,
          credit: totalNetVal,
          description: 'صافي الرواتب المستحقة للموظفين',
        },
      });

      // Credit Deductions
      if (totalDeductionsVal > 0) {
        await tx.journalItem.create({
          data: {
            journalEntryId: entry.id,
            accountId: deductionsPayableAcc.id,
            debit: 0,
            credit: totalDeductionsVal,
            description: 'إجمالي استقطاعات الضرائب والضمان والجزاءات',
          },
        });
      }

      // Update Ledger Balances
      await tx.account.update({
        where: { id: salaryExpenseAcc.id },
        data: { currentBalance: { increment: totalGrossVal } },
      });
      await tx.account.update({
        where: { id: payrollPayableAcc.id },
        data: { currentBalance: { decrement: totalNetVal } },
      });
      if (totalDeductionsVal > 0) {
        await tx.account.update({
          where: { id: deductionsPayableAcc.id },
          data: { currentBalance: { decrement: totalDeductionsVal } },
        });
      }

      // 3. Lock payroll run status
      const updated = await tx.payrollRun.update({
        where: { id },
        data: {
          status: 'LOCKED',
          journalEntryId: entry.id,
        },
      });

      // 4. Generate Payslips automatically
      for (const item of run.items) {
        await tx.payslip.create({
          data: {
            payrollItemId: item.id,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'PAYROLL_LOCKED',
          entityName: 'PayrollRun',
          entityId: id,
          userId: currentUserId || null,
          newValues: updated as any,
        },
      });

      return updated;
    });
  }

  // ==========================================
  // PAYSLIPS & PRINT AUDIT
  // ==========================================
  async getPayslips() {
    return this.prisma.payslip.findMany({
      include: {
        payrollItem: {
          include: {
            employee: true,
            payrollRun: { include: { payrollPeriod: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPayslipById(id: string) {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id },
      include: {
        payrollItem: {
          include: {
            employee: { include: { department: true, position: true } },
            payrollRun: { include: { payrollPeriod: true } },
            allowances: true,
            deductions: true,
          },
        },
      },
    });
    if (!payslip) throw new NotFoundException('قسيمة الراتب غير موجودة.');
    return payslip;
  }

  async logPayslipPrinted(id: string, currentUserId?: string) {
    await this.prisma.auditLog.create({
      data: {
        action: 'PAYSLIP_PRINTED',
        entityName: 'Payslip',
        entityId: id,
        userId: currentUserId || null,
      },
    });
    return { success: true };
  }
}

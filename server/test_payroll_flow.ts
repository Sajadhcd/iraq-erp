import { PrismaService } from "./src/prisma/prisma.service";
import { PayrollService } from "./src/payroll/payroll.service";

const prisma = new PrismaService();
const service = new PayrollService(prisma);

async function runTest() {
  console.log("=== STARTING PAYROLL INTEGRATION TEST ===");

  // 1. Setup Payroll Period
  console.log("\n--- Step 1: Setup Payroll Period ---");
  const periodCode = `P-TEST-${Date.now().toString().slice(-4)}`;
  const startDate = new Date();
  startDate.setHours(0,0,0,0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1); // 2 days range

  const period = await service.createPayrollPeriod({
    code: periodCode,
    nameAr: "دورة رواتب تجريبية",
    nameEn: "Test Payroll Period",
    startDate: startDate.toISOString().substring(0, 10),
    endDate: endDate.toISOString().substring(0, 10),
  });
  console.log("Payroll Period Created:", period.code);

  // 2. Setup Employee & Salary Structure
  console.log("\n--- Step 2: Setup Employee & Salary Structure ---");
  const role = await prisma.role.findFirst({ where: { name: "SUPER_ADMIN" } });
  if (!role) throw new Error("SUPER_ADMIN role not found");
  const emp = await prisma.employee.create({
    data: {
      firstName: "رائد",
      lastName: "سالم",
      employeeNumber: `EMP-TEST-PR-${Date.now().toString().slice(-4)}`,
      roleId: role.id,
      status: "ACTIVE",
    },
  });

  const salaryStruct = await service.upsertSalaryStructure({
    employeeId: emp.id,
    basicSalary: 3000.0, // 3000 basic
    housing: 500.0,      // 500 housing
    transportation: 300.0,// 300 transportation
    food: 100.0,        // 100 food
    risk: 100.0,        // 100 risk
    otherAllowances: 0.0,
    taxPct: 5.0,        // 5% tax
    insurance: 150.0,    // 150 flat insurance
  });
  console.log("Salary Structure upserted successfully. Basic:", salaryStruct.basicSalary);

  // 3. Create mock attendance records (Day 1: Present, 9.5 hours (1.5h overtime), 45 mins late; Day 2: Absent)
  console.log("\n--- Step 3: Setup Mock Attendance logs ---");
  // Day 1: Present
  const date1 = new Date(startDate);
  const checkIn1 = new Date(date1);
  checkIn1.setHours(9, 45, 0, 0); // 45 mins late
  const checkOut1 = new Date(date1);
  checkOut1.setHours(19, 15, 0, 0); // 9.5 hours work => 1.5 hours overtime

  await prisma.attendance.create({
    data: {
      employeeId: emp.id,
      attendanceDate: date1,
      checkIn: checkIn1,
      checkOut: checkOut1,
      status: "PRESENT",
      workHours: 9.5,
      overtimeHours: 1.5,
      lateMinutes: 45,
    },
  });

  // Day 2: Absent
  const date2 = new Date(endDate);
  await prisma.attendance.create({
    data: {
      employeeId: emp.id,
      attendanceDate: date2,
      status: "ABSENT",
    },
  });
  console.log("Mock Attendance logs created successfully.");

  // 4. Run Payroll calculation
  console.log("\n--- Step 4: Run Payroll Run Creation ---");
  const run = await service.createPayrollRun(period.id);
  console.log(`Payroll Run Created. ID: ${run.id}, Status: ${run.status}`);

  const item = await prisma.payrollItem.findFirst({
    where: { payrollRunId: run.id, employeeId: emp.id },
  });
  if (!item) throw new Error("PayrollItem not created for employee");

  console.log("\n--- Verification of Calculations ---");
  console.log(`Imported Working Hours: ${item.workingHours}`);
  console.log(`Imported Overtime Hours: ${item.overtimeHours}`);
  console.log(`Imported Late Minutes: ${item.lateMinutes}`);
  console.log(`Imported Absent Days: ${item.absentDays}`);

  // Checks:
  // hourRate = 3000 / 30 / 8 = 12.5
  // minRate = 12.5 / 60 = 0.2083
  // Overtime pay = 1.5 * 12.5 * 1.5 = 28.125 => 28.13
  // Late deduction = 45 * 0.2083 = 9.375 => 9.38
  // Absent deduction = (3000 / 30) * 1 = 100.00
  // Gross = 3000 + 500 (housing) + 300 (trans) + 100 (food) + 100 (risk) + 28.13 (overtime) = 4028.13
  // Tax = 4028.13 * 5% = 201.41
  // Net = 4028.13 - (201.41 + 150 (insurance) + 9.38 (late) + 100 (absent)) = 3567.34

  console.log(`Calculated Overtime Pay: ${item.overtimePay} (Expected: ~28.13)`);
  console.log(`Calculated Late Deduction: ${item.lateDeduction} (Expected: ~9.38)`);
  console.log(`Calculated Absent Deduction: ${item.absentDeduction} (Expected: 100.00)`);
  console.log(`Calculated Gross Salary: ${item.grossSalary} (Expected: ~4028.13)`);
  console.log(`Calculated Net Salary: ${item.netSalary} (Expected: ~3567.34)`);

  if (Math.abs(Number(item.overtimePay) - 28.13) > 0.05) throw new Error("Overtime pay calculation error");
  if (Math.abs(Number(item.lateDeduction) - 9.38) > 0.05) throw new Error("Late deduction calculation error");
  if (Math.abs(Number(item.absentDeduction) - 100.00) > 0.05) throw new Error("Absent deduction calculation error");
  if (Math.abs(Number(item.grossSalary) - 4028.13) > 0.1) throw new Error("Gross salary calculation error");
  if (Math.abs(Number(item.netSalary) - 3567.34) > 0.1) throw new Error("Net salary calculation error");

  // 5. Test Duplicate Prevention
  console.log("\n--- Step 5: Duplicate Prevention Test ---");
  try {
    await service.createPayrollRun(period.id);
    throw new Error("Duplicate prevention failed - allowed running twice");
  } catch (err: any) {
    console.log("Duplicate run prevented correctly:", err.message);
  }

  // 6. Lock Payroll and Accounting entries integration check
  console.log("\n--- Step 6: Locking Payroll & Accounting Entries ---");
  await service.approvePayrollRun(run.id);
  const user = await prisma.user.findFirst();
  const lockedRun = await service.lockPayrollRun(run.id, user?.id);
  console.log(`Payroll Run locked successfully. Status: ${lockedRun.status}, Journal Entry: ${lockedRun.journalEntryId}`);

  if (lockedRun.status !== "LOCKED" || !lockedRun.journalEntryId) {
    throw new Error("Locking failed");
  }

  // Check generated Journal Entry
  const je = await prisma.journalEntry.findUnique({
    where: { id: lockedRun.journalEntryId },
    include: { items: { include: { account: true } } },
  });
  console.log(`Journal Entry ${je?.entryNumber} Details:`);
  je?.items.forEach((jei) => {
    console.log(`- Account: [${jei.account.code}] ${jei.account.nameEn} | Debit: ${jei.debit} | Credit: ${jei.credit}`);
  });

  if (je?.status !== "POSTED") throw new Error("Journal entry not posted");
  if (je?.items.length !== 3) throw new Error("Expected 3 ledger line entries");

  // Check account balances are updated
  const expAcc = await prisma.account.findUnique({ where: { code: "5001" } });
  console.log(`Salary Expense account balance: ${expAcc?.currentBalance}`);
  if (Number(expAcc?.currentBalance) === 0) throw new Error("Ledger balance update failed");

  // 7. Verify Payslip generation
  console.log("\n--- Step 7: Payslip Verification ---");
  const payslips = await service.getPayslips();
  const payslip = payslips.find((p) => p.payrollItem.employeeId === emp.id);
  console.log(`Payslip generated. Number: ${payslip?.payslipNumber}, ID: ${payslip?.id}`);
  if (!payslip) throw new Error("Payslip was not generated during payroll lock");

  // Clean up
  console.log("\nCleaning up test assets...");
  await prisma.payslip.deleteMany({ where: { payrollItemId: item.id } });
  await prisma.payrollItem.deleteMany({ where: { payrollRunId: run.id } });
  await prisma.payrollRun.delete({ where: { id: run.id } });
  await prisma.payrollPeriod.delete({ where: { id: period.id } });
  await prisma.attendance.deleteMany({ where: { employeeId: emp.id } });
  await prisma.salaryStructure.delete({ where: { employeeId: emp.id } });
  await prisma.employee.delete({ where: { id: emp.id } });

  console.log("\n=== ALL PAYROLL SYSTEM INTEGRATION TESTS PASSED SUCCESSFULLY! ===");
}

runTest()
  .catch((err) => {
    console.error("\n❌ PAYROLL INTEGRATION TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

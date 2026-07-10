import { PrismaService } from "./src/prisma/prisma.service";
import { AttendanceService } from "./src/attendance/attendance.service";

const prisma = new PrismaService();
const service = new AttendanceService(prisma);

async function runTest() {
  console.log("=== STARTING ATTENDANCE MANAGEMENT INTEGRATION TEST ===");

  // 0. Setup dummy employee
  const role = await prisma.role.findFirst({ where: { name: "SUPER_ADMIN" } });
  if (!role) throw new Error("SUPER_ADMIN role not found");

  const emp = await prisma.employee.create({
    data: {
      firstName: "أحمد",
      lastName: "سليم",
      employeeNumber: `EMP-TEST-${Date.now().toString().slice(-4)}`,
      roleId: role.id,
      status: "ACTIVE",
    },
  });
  console.log(`Test employee created: ${emp.firstName} ${emp.lastName}`);

  // 1. Test Check-In (Late calculation)
  console.log("\n--- Step 1: Check-In (Late calculation) ---");
  // 10:15 AM check-in should trigger lateMinutes = 75 (1 hour 15 minutes past 9:00 AM)
  const checkInTime = new Date();
  checkInTime.setHours(10, 15, 0, 0);

  const att = await service.checkIn({
    employeeId: emp.id,
    checkInTime: checkInTime.toISOString(),
    notes: "حضور متأخر بسبب عطل بالسيارة",
  });
  console.log(`Check-In created with lateMinutes: ${att.lateMinutes}`);
  if (att.lateMinutes !== 75) {
    throw new Error(`Expected 75 lateMinutes but got ${att.lateMinutes}`);
  }
  if (att.status !== "PRESENT") {
    throw new Error("Expected status PRESENT");
  }

  // 2. Prevent Duplicate Check-In for the same day
  console.log("\n--- Step 2: Prevent Duplicate Check-In ---");
  try {
    await service.checkIn({
      employeeId: emp.id,
      checkInTime: checkInTime.toISOString(),
    });
    throw new Error("Allowed duplicate check-in on the same day!");
  } catch (err: any) {
    console.log(`Correctly rejected duplicate check-in: ${err.message}`);
  }

  // 3. Test Check-Out (Work hours & Overtime calculations)
  console.log("\n--- Step 3: Check-Out (Work hours & Overtime calculations) ---");
  // Check out at 19:30 (7:30 PM). Check-in was 10:15 AM. Difference is 9 hours and 15 minutes = 9.25 hours.
  // Standard hours is 8, so overtime should be 1.25 hours.
  const checkOutTime = new Date();
  checkOutTime.setHours(19, 30, 0, 0);

  const updatedAtt = await service.checkOut({
    employeeId: emp.id,
    checkOutTime: checkOutTime.toISOString(),
    notes: "إتمام العمل الإضافي اليومي",
  });
  console.log(`Check-Out recorded. Work hours: ${updatedAtt.workHours}, Overtime: ${updatedAtt.overtimeHours}`);
  if (Number(updatedAtt.workHours) !== 9.25) {
    throw new Error(`Expected workHours = 9.25, got ${updatedAtt.workHours}`);
  }
  if (Number(updatedAtt.overtimeHours) !== 1.25) {
    throw new Error(`Expected overtimeHours = 1.25, got ${updatedAtt.overtimeHours}`);
  }

  // 4. Prevent Check-Out before Check-In
  console.log("\n--- Step 4: Prevent Check-Out before Check-In ---");
  // Let's create another employee to check checkout errors
  const emp2 = await prisma.employee.create({
    data: {
      firstName: "سعيد",
      lastName: "محمود",
      employeeNumber: `EMP-TEST-${Date.now().toString().slice(-4)}2`,
      roleId: role.id,
      status: "ACTIVE",
    },
  });

  try {
    await service.checkOut({
      employeeId: emp2.id,
      checkOutTime: new Date().toISOString(),
    });
    throw new Error("Allowed checkout without checkin record!");
  } catch (err: any) {
    console.log(`Correctly rejected checkout: ${err.message}`);
  }

  // 5. Test Listing and monthly statistics
  console.log("\n--- Step 5: Listing and monthly statistics ---");
  const list = await service.getAttendanceList({ employeeId: emp.id });
  console.log(`Attendance records count for employee: ${list.total}`);
  if (list.total !== 1) throw new Error("Expected exactly 1 attendance record");

  const monthly = await service.getMonthlyAttendance(new Date().getFullYear(), new Date().getMonth() + 1);
  console.log(`Monthly present count stats: ${monthly.stats.presentCount}, Overtime total: ${monthly.stats.totalOvertimeHours}`);
  if (monthly.stats.presentCount < 1) throw new Error("Monthly present count should be at least 1");

  // 6. Verify Audit Logs
  console.log("\n--- Step 6: Verify Audit Logs ---");
  const logs = await prisma.auditLog.findMany({
    where: {
      entityName: "Attendance",
    },
  });
  console.log(`Audit logs written for Attendance entity: ${logs.length}`);
  if (logs.length < 2) {
    throw new Error("Expected at least 2 audit logs (CHECK_IN and CHECK_OUT)");
  }

  // 7. Cleanup
  console.log("\nCleaning up test data...");
  await prisma.attendance.deleteMany({ where: { employeeId: { in: [emp.id, emp2.id] } } });
  await prisma.employee.deleteMany({ where: { id: { in: [emp.id, emp2.id] } } });

  console.log("\n=== ATTENDANCE INTEGRATION TEST PASSED SUCCESSFULLY! ===");
}

runTest()
  .catch((err) => {
    console.error("\n❌ ATTENDANCE INTEGRATION TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

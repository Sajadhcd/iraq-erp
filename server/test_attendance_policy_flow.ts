import { PrismaService } from "./src/prisma/prisma.service";
import { AttendanceService } from "./src/attendance/attendance.service";

const prisma = new PrismaService();
const service = new AttendanceService(prisma);

async function runTest() {
  console.log("=== STARTING ATTENDANCE POLICY INTEGRATION TEST ===");

  // 1. Update Attendance Policy Settings
  console.log("\n--- Step 1: Update Policy Settings ---");
  const testPolicy = {
    startTime: '08:30', // Start time 8:30 AM
    endTime: '16:30',
    gracePeriod: 20, // 20 minutes grace period
    minWorkHours: 8,
    overtimeStartsAfter: 7.5, // Overtime starts after 7.5 hours
    weekendDays: [5, 6],
  };

  await service.updatePolicy(testPolicy);
  const loadedPolicy = await service.getPolicy();
  console.log("Loaded Policy Grace Period:", loadedPolicy.gracePeriod);
  if (loadedPolicy.gracePeriod !== 20) throw new Error("Policy update failed");

  // 2. Setup dummy employee
  const role = await prisma.role.findFirst({ where: { name: "SUPER_ADMIN" } });
  if (!role) throw new Error("SUPER_ADMIN role not found");
  const emp = await prisma.employee.create({
    data: {
      firstName: "سليم",
      lastName: "حسن",
      employeeNumber: `EMP-TEST-POL-${Date.now().toString().slice(-4)}`,
      roleId: role.id,
      status: "ACTIVE",
    },
  });

  // 3. Test Grace Period cutoff (check-in <= startTime + gracePeriod => lateMinutes = 0)
  console.log("\n--- Step 2: Test Check-In Within Grace Period ---");
  // Policy start is 8:30, check-in at 8:45 (15 mins late but within 20 mins grace period)
  const checkInTime1 = new Date();
  checkInTime1.setHours(8, 45, 0, 0);

  const att1 = await service.checkIn({
    employeeId: emp.id,
    checkInTime: checkInTime1.toISOString(),
  });
  console.log(`Check-In within grace period. lateMinutes: ${att1.lateMinutes}`);
  if (att1.lateMinutes !== 0) {
    throw new Error(`Expected lateMinutes = 0, got ${att1.lateMinutes}`);
  }

  // 4. Test checkout calculations with 7.5 hours overtime policy
  console.log("\n--- Step 3: Test Overtime Calculation ---");
  // Check out at 17:15. Check-in was 8:45. total hours = 8.5 hours.
  // Overtime starts after 7.5 hours, so overtime = 1.0 hour.
  const checkOutTime1 = new Date();
  checkOutTime1.setHours(17, 15, 0, 0);

  const updatedAtt1 = await service.checkOut({
    employeeId: emp.id,
    checkOutTime: checkOutTime1.toISOString(),
  });
  console.log(`Work hours: ${updatedAtt1.workHours}, Overtime: ${updatedAtt1.overtimeHours}`);
  if (Number(updatedAtt1.workHours) !== 8.5) {
    throw new Error(`Expected workHours = 8.5, got ${updatedAtt1.workHours}`);
  }
  if (Number(updatedAtt1.overtimeHours) !== 1.0) {
    throw new Error(`Expected overtime = 1.0, got ${updatedAtt1.overtimeHours}`);
  }

  // Delete previous checkin to check late past grace period
  await prisma.attendance.delete({ where: { id: att1.id } });

  // 5. Test Check-In past Grace Period (checkIn > startTime + gracePeriod => lateMinutes = diff)
  console.log("\n--- Step 4: Test Check-In Past Grace Period ---");
  // Check-in at 9:10 (40 mins past 8:30 start time)
  const checkInTime2 = new Date();
  checkInTime2.setHours(9, 10, 0, 0);

  const att2 = await service.checkIn({
    employeeId: emp.id,
    checkInTime: checkInTime2.toISOString(),
  });
  console.log(`Check-In past grace period. lateMinutes: ${att2.lateMinutes}`);
  if (att2.lateMinutes !== 40) {
    throw new Error(`Expected lateMinutes = 40, got ${att2.lateMinutes}`);
  }

  // Cleanup
  console.log("\nCleaning up test assets...");
  await prisma.attendance.deleteMany({ where: { employeeId: emp.id } });
  await prisma.employee.delete({ where: { id: emp.id } });

  console.log("\n=== ATTENDANCE POLICY INTEGRATION TEST PASSED SUCCESSFULLY! ===");
}

runTest()
  .catch((err) => {
    console.error("\n❌ POLICY INTEGRATION TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

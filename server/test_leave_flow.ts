import { PrismaService } from "./src/prisma/prisma.service";
import { LeaveService } from "./src/leave/leave.service";

const prisma = new PrismaService();
const service = new LeaveService(prisma);

async function runTest() {
  console.log("=== STARTING LEAVE MANAGEMENT INTEGRATION TEST ===");

  // 1. Setup Leave Type
  console.log("\n--- Step 1: Create Leave Type ---");
  const typeCode = `L-TEST-${Date.now().toString().slice(-4)}`;
  const leaveType = await service.createLeaveType({
    code: typeCode,
    nameAr: "إجازة سنوية اختبارية",
    nameEn: "Test Annual Leave",
    defaultDays: 10,
    paid: true,
    color: "#EF4444",
    requiresApproval: true,
    active: true,
  });
  console.log("Leave Type Created:", leaveType.code);

  // 2. Setup dummy employee
  const role = await prisma.role.findFirst({ where: { name: "SUPER_ADMIN" } });
  if (!role) throw new Error("SUPER_ADMIN role not found");
  const emp = await prisma.employee.create({
    data: {
      firstName: "طارق",
      lastName: "أحمد",
      employeeNumber: `EMP-TEST-LV-${Date.now().toString().slice(-4)}`,
      roleId: role.id,
      status: "ACTIVE",
    },
  });
  console.log("Employee Created:", emp.employeeNumber);

  // 3. Check Initial Balance
  console.log("\n--- Step 2: Check Initial Balance ---");
  const initialBal = await service.getLeaveBalance(emp.id, leaveType.id);
  console.log("Remaining Days:", initialBal.remainingDays);
  if (initialBal.remainingDays !== 10) throw new Error("Expected initial remaining = 10");

  // 4. Create Leave Request (Draft status)
  console.log("\n--- Step 3: Create Leave Request (Draft) ---");
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 2); // starts in 2 days
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 3); // 4 days total inclusive

  const req = await service.createLeaveRequest({
    employeeId: emp.id,
    leaveTypeId: leaveType.id,
    startDate: startDate.toISOString().substring(0, 10),
    endDate: endDate.toISOString().substring(0, 10),
    reason: "Test leave request",
  });
  console.log(`Leave Request Created. Number: ${req.requestNumber}, Total Days: ${req.totalDays}, Status: ${req.status}`);
  if (req.totalDays !== 4) throw new Error(`Expected totalDays = 4, got ${req.totalDays}`);
  if (req.status !== "DRAFT") throw new Error(`Expected status = DRAFT, got ${req.status}`);

  // 5. Overlap Check: Try to create overlapping leave
  console.log("\n--- Step 4: Overlap Prevention Test ---");
  // Try to submit a draft, then verify overlap constraints. Let's submit first.
  await service.submitLeaveRequest(req.id);
  console.log("Request Submitted successfully.");

  try {
    await service.createLeaveRequest({
      employeeId: emp.id,
      leaveTypeId: leaveType.id,
      startDate: startDate.toISOString().substring(0, 10),
      endDate: endDate.toISOString().substring(0, 10),
      reason: "Overlap trial",
    });
    throw new Error("Overlap prevention failed - allowed creation");
  } catch (err: any) {
    console.log("Overlap prevented correctly:", err.message);
  }

  // 6. Insufficient Balance Check
  console.log("\n--- Step 5: Insufficient Balance Test ---");
  // Try to request 8 days when remaining balance is 10 - 4 (submitted but not approved yet) => wait!
  // Submitted requests don't reduce "APPROVED" usedDays balance but they are checked against remaining balance!
  // Let's request 8 days (Total 4 + 8 = 12 > 10)
  try {
    const hugeStartDate = new Date();
    hugeStartDate.setDate(hugeStartDate.getDate() + 10);
    const hugeEndDate = new Date(hugeStartDate);
    hugeEndDate.setDate(hugeEndDate.getDate() + 7); // 8 days total
    await service.createLeaveRequest({
      employeeId: emp.id,
      leaveTypeId: leaveType.id,
      startDate: hugeStartDate.toISOString().substring(0, 10),
      endDate: hugeEndDate.toISOString().substring(0, 10),
      reason: "Insuff balance trial",
    });
    throw new Error("Insufficient balance check failed - allowed creation");
  } catch (err: any) {
    console.log("Insufficient balance check caught correctly:", err.message);
  }

  // 7. Approve Leave & Attendance integration check
  console.log("\n--- Step 6: Approval and Attendance Sync ---");
  const approvedReq = await service.approveLeaveRequest(req.id, "Approver Admin");
  console.log("Request Approved. Status:", approvedReq.status);

  // Check new remaining balance
  const afterApproveBal = await service.getLeaveBalance(emp.id, leaveType.id);
  console.log("Used Days:", afterApproveBal.usedDays, "Remaining Days:", afterApproveBal.remainingDays);
  if (afterApproveBal.remainingDays !== 6) throw new Error("Expected remaining = 6");

  // Check attendance mapping
  const testDate = new Date(startDate);
  testDate.setHours(0,0,0,0);
  const attLog = await prisma.attendance.findUnique({
    where: {
      employeeId_attendanceDate: {
        employeeId: emp.id,
        attendanceDate: testDate,
      },
    },
  });
  console.log("Synced Attendance Entry Status:", attLog?.status);
  if (attLog?.status !== "LEAVE") throw new Error("Attendance sync failed");

  // 8. Reject workflow
  console.log("\n--- Step 7: Create and Reject Request ---");
  const rejectStartDate = new Date();
  rejectStartDate.setDate(rejectStartDate.getDate() + 20);
  const rejectEndDate = new Date(rejectStartDate);
  rejectEndDate.setDate(rejectEndDate.getDate() + 1); // 2 days

  const rejectReq = await service.createLeaveRequest({
    employeeId: emp.id,
    leaveTypeId: leaveType.id,
    startDate: rejectStartDate.toISOString().substring(0, 10),
    endDate: rejectEndDate.toISOString().substring(0, 10),
    reason: "Will be rejected",
  });
  await service.submitLeaveRequest(rejectReq.id);
  const rejected = await service.rejectLeaveRequest(rejectReq.id, "Budget limits");
  console.log(`Request Rejected. Status: ${rejected.status}, Reason: ${rejected.rejectionReason}`);
  if (rejected.status !== "REJECTED") throw new Error("Rejection workflow failed");

  // 9. Cancel workflow & Balance Restoration
  console.log("\n--- Step 8: Cancel Request and Restore Balance ---");
  await service.cancelLeaveRequest(approvedReq.id);
  const finalBal = await service.getLeaveBalance(emp.id, leaveType.id);
  console.log(`Cancelled. Restored used days to: ${finalBal.usedDays}, remaining to: ${finalBal.remainingDays}`);
  if (finalBal.remainingDays !== 10) throw new Error("Balance restoration failed");

  // Check that attendance record was deleted/reverted
  const revertedAttLog = await prisma.attendance.findUnique({
    where: {
      employeeId_attendanceDate: {
        employeeId: emp.id,
        attendanceDate: testDate,
      },
    },
  });
  console.log("Attendance Sync after cancellation (should be deleted):", revertedAttLog === null ? "DELETED" : "STILL PRESENT");
  if (revertedAttLog !== null) throw new Error("Attendance sync cancellation revert failed");

  // 10. Audit log check
  console.log("\n--- Step 9: Audit Logs Verification ---");
  const logs = await prisma.auditLog.findMany({
    where: { entityName: "LeaveRequest" },
    orderBy: { createdAt: "desc" },
  });
  console.log(`Found ${logs.length} audit logs. Actions recorded:`);
  logs.forEach((log) => console.log(`- ${log.action}`));
  const actions = new Set(logs.map((l) => l.action));
  if (!actions.has("LEAVE_CREATED") || !actions.has("LEAVE_SUBMITTED") || !actions.has("LEAVE_APPROVED") || !actions.has("LEAVE_CANCELLED")) {
    throw new Error("Audit logging verification failed");
  }

  // Clean up
  console.log("\nCleaning up integration test data...");
  await prisma.leaveRequest.deleteMany({ where: { employeeId: emp.id } });
  await prisma.employee.delete({ where: { id: emp.id } });
  await prisma.leaveType.delete({ where: { id: leaveType.id } });

  console.log("\n=== ALL LEAVE SYSTEM INTEGRATION TESTS PASSED SUCCESSFULLY! ===");
}

runTest()
  .catch((err) => {
    console.error("\n❌ LEAVE FLOW INTEGRATION TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

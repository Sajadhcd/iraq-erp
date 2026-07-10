import { PrismaService } from "./src/prisma/prisma.service";
import { HrmsService } from "./src/hrms/hrms.service";

const prisma = new PrismaService();
const hrmsService = new HrmsService(prisma);

async function runTest() {
  console.log("=== STARTING HRMS FOUNDATION WORKFLOW INTEGRATION TEST ===");

  // 1. Create Department
  console.log("\n--- Step 1: Create Department ---");
  const dept = await hrmsService.createDepartment({
    arabicName: "الموارد البشرية",
    englishName: "Human Resources",
    description: "إدارة الموارد البشرية وشؤون الموظفين",
  });
  console.log(`Department created: ${dept.englishName} / ${dept.arabicName}, Code: ${dept.departmentCode}`);
  if (dept.englishName !== "Human Resources") throw new Error("Incorrect department name");

  // 2. Create Position
  console.log("\n--- Step 2: Create Job Position ---");
  const pos = await hrmsService.createPosition({
    arabicName: "أخصائي توظيف",
    englishName: "Recruitment Specialist",
    departmentId: dept.id,
    description: "مسؤول عن استقطاب وتوظيف المواهب",
  });
  console.log(`Job Position created: ${pos.englishName}, Code: ${pos.positionCode}`);
  if (pos.englishName !== "Recruitment Specialist") throw new Error("Incorrect position name");
  if (pos.departmentId !== dept.id) throw new Error("Job position not linked to department");

  // 3. Create Employee
  console.log("\n--- Step 3: Create Employee ---");
  const superAdminRole = await prisma.role.findFirst({ where: { name: "SUPER_ADMIN" } });
  if (!superAdminRole) throw new Error("SUPER_ADMIN role not found in database.");

  const employee = await hrmsService.createEmployee({
    firstName: "علي",
    lastName: "حسن",
    arabicFullName: "علي حسن محمد",
    englishFullName: "Ali Hassan Mohammad",
    nationalId: "NID-1290380",
    passportNumber: "PP-380129",
    gender: "MALE",
    dateOfBirth: "1990-05-15",
    nationality: "Iraqi",
    maritalStatus: "MARRIED",
    hireDate: new Date().toISOString(),
    employmentType: "FULL_TIME",
    branch: "Baghdad Head Office",
    departmentId: dept.id,
    positionId: pos.id,
    email: "ali.hassan@company.com",
    phone: "0770112233",
    address: "العراق، بغداد، الكرادة",
    emergencyContact: "أحمد حسن (أخ) - 0770998877",
    notes: "موظف متميز في التوظيف",
    status: "ACTIVE",
    roleId: superAdminRole.id,
  });
  console.log(`Employee created: ${employee.englishFullName}, Number: ${employee.employeeNumber}`);
  if (employee.employeeNumber === undefined) throw new Error("Employee number auto generation failed");

  // 4. Upload Documents
  console.log("\n--- Step 4: Upload Employee Documents ---");
  const doc = await hrmsService.uploadDocument(employee.id, {
    fileName: "passport_scan.pdf",
    fileType: "Passport",
    fileUrl: "/uploads/docs/passport_scan.pdf",
  });
  console.log(`Document uploaded: ${doc.fileName}, Type: ${doc.fileType}`);

  // Fetch details and verify document is listed and timeline logged
  const details = await hrmsService.getEmployeeDetails(employee.id);
  console.log(`Documents count: ${details.documents.length}, Timelines count: ${details.timeline.length}`);
  if (details.documents.length !== 1) throw new Error("Expected 1 document");
  if (details.timeline.length < 2) throw new Error("Expected at least 2 timeline events (CREATED, DOCUMENT_UPLOADED)");

  // 5. Search Employee
  console.log("\n--- Step 5: Search / List Employees ---");
  const listResult = await hrmsService.getEmployees({
    search: "Ali Hassan",
    departmentId: dept.id,
  });
  console.log(`Search result count: ${listResult.items.length}`);
  if (listResult.items.length === 0) throw new Error("Search by english full name failed");

  // 6. Edit Employee
  console.log("\n--- Step 6: Edit Employee ---");
  const updatedEmp = await hrmsService.updateEmployee(employee.id, {
    phone: "0770999888",
    status: "LEAVE",
  });
  console.log(`Updated Employee Phone: ${updatedEmp.phone}, Status: ${updatedEmp.status}`);
  if (updatedEmp.phone !== "0770999888") throw new Error("Update phone failed");

  // 7. Delete Employee
  console.log("\n--- Step 7: Delete Employee (Soft Delete) ---");
  await hrmsService.deleteEmployee(employee.id);
  
  // Verify it is not listed in active employees search
  const listAfterDelete = await hrmsService.getEmployees({ search: "Ali Hassan" });
  console.log(`Active count after delete: ${listAfterDelete.items.length}`);
  if (listAfterDelete.items.length !== 0) throw new Error("Soft deleted employee is still listed");

  // Verify timeline contains DELETE event
  const deletedDetails = await prisma.employee.findUnique({
    where: { id: employee.id },
    include: { timeline: true },
  });
  const hasDeleteEvent = deletedDetails?.timeline.some(t => t.type === "DELETED");
  console.log(`Has delete event in timeline: ${hasDeleteEvent}`);
  if (!hasDeleteEvent) throw new Error("Soft delete timeline log missing");

  // Verify audit logs exist
  const auditLogs = await prisma.auditLog.findMany({
    where: { entityId: employee.id },
  });
  console.log(`Audit logs written for employee entity: ${auditLogs.length}`);
  if (auditLogs.length === 0) throw new Error("No audit logs written");

  // 8. Cleanup
  console.log("\nCleaning up test data...");
  await prisma.employeeDocument.deleteMany({ where: { employeeId: employee.id } });
  await prisma.employeeTimeline.deleteMany({ where: { employeeId: employee.id } });
  await prisma.employee.delete({ where: { id: employee.id } });
  await prisma.jobPosition.delete({ where: { id: pos.id } });
  await prisma.department.delete({ where: { id: dept.id } });

  console.log("\n=== HRMS FOUNDATION WORKFLOW INTEGRATION TEST PASSED SUCCESSFULLY! ===");
}

runTest()
  .catch((err) => {
    console.error("\n❌ HRMS INTEGRATION TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

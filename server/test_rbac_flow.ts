import { PrismaService } from "./src/prisma/prisma.service";
import { UsersService } from "./src/users/users.service";
import { AuthService } from "./src/auth/auth.service";

const prisma = new PrismaService();
const usersService = new UsersService(prisma);

async function testRbacFlow() {
  console.log("=== STARTING ENTERPRISE RBAC SYSTEM TESTS ===");

  // 1. Setup Test Role and Permissions
  const testRole = await prisma.role.upsert({
    where: { name: "TEST_CLERK" },
    update: {},
    create: { name: "TEST_CLERK", description: "Test security clerk role" },
  });

  const perm1 = await prisma.permission.upsert({
    where: { action: "inventory:view" },
    update: {},
    create: { action: "inventory:view", description: "View inventory" },
  });

  const perm2 = await prisma.permission.upsert({
    where: { action: "products:create" },
    update: {},
    create: { action: "products:create", description: "Create products" },
  });

  const perm3 = await prisma.permission.upsert({
    where: { action: "sales:checkout" },
    update: {},
    create: { action: "sales:checkout", description: "Sales POS checkout" },
  });

  // Map inventory:view to TEST_CLERK
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: testRole.id,
        permissionId: perm1.id,
      },
    },
    update: {},
    create: {
      roleId: testRole.id,
      permissionId: perm1.id,
    },
  });

  // 2. Create Test User & Employee linked to TEST_CLERK
  const email = "rbac-test@system.com";
  
  // Cleanup previous attempts if any
  const oldUser = await prisma.user.findUnique({ where: { email } });
  if (oldUser) {
    await prisma.userPermission.deleteMany({ where: { userId: oldUser.id } });
    await prisma.employee.deleteMany({ where: { userId: oldUser.id } });
    await prisma.user.delete({ where: { id: oldUser.id } });
  }

  const testUser = await usersService.create({
    email,
    username: "rbacclerk",
    passwordHash: "clerkpass123",
  });

  const employee = await prisma.employee.create({
    data: {
      firstName: "Test",
      lastName: "Clerk",
      userId: testUser.id,
      roleId: testRole.id,
    },
  });

  console.log("Test user and employee linked successfully.");

  // 3. Check Initial Permissions (Inherited from role)
  let activePerms = await usersService.getUserPermissions(testUser.id);
  let inventoryViewPerm = activePerms.find(p => p.action === "inventory:view");
  let productsCreatePerm = activePerms.find(p => p.action === "products:create");

  console.log(`Inherited inventory:view active: ${inventoryViewPerm?.active} (Expected: true)`);
  console.log(`Inherited products:create active: ${productsCreatePerm?.active} (Expected: false)`);

  if (!inventoryViewPerm?.active || productsCreatePerm?.active) {
    throw new Error("Initial inherited permission checks failed.");
  }

  // 4. Set User Overrides (Grant products:create, Deny inventory:view)
  await usersService.updateUserPermissions(testUser.id, {
    overrides: [
      { permissionId: perm2.id, status: "ALLOW" }, // grant products:create
      { permissionId: perm1.id, status: "DENY" },  // deny inventory:view
    ],
  });

  console.log("User permission overrides saved successfully.");

  // 5. Verify Permissions Override Calculations
  activePerms = await usersService.getUserPermissions(testUser.id);
  inventoryViewPerm = activePerms.find(p => p.action === "inventory:view");
  productsCreatePerm = activePerms.find(p => p.action === "products:create");

  console.log(`Overridden inventory:view active: ${inventoryViewPerm?.active} (Expected: false)`);
  console.log(`Overridden products:create active: ${productsCreatePerm?.active} (Expected: true)`);

  if (inventoryViewPerm?.active || !productsCreatePerm?.active) {
    throw new Error("User permission override checks failed.");
  }

  // 6. Verify Audit Logs Recorded
  const logs = await prisma.auditLog.findMany({
    where: { entityId: testUser.id },
    orderBy: { createdAt: "desc" },
  });
  console.log(`Audit log records verified count: ${logs.length} (Expected >= 1)`);
  if (logs.length === 0) {
    throw new Error("Audit logs not captured for permission changes.");
  }

  // 7. Cleanup test assets
  await prisma.userPermission.deleteMany({ where: { userId: testUser.id } });
  await prisma.employee.delete({ where: { id: employee.id } });
  await prisma.user.delete({ where: { id: testUser.id } });
  await prisma.rolePermission.deleteMany({ where: { roleId: testRole.id } });
  await prisma.role.delete({ where: { id: testRole.id } });

  console.log("=== ALL ENTERPRISE RBAC SYSTEM TESTS PASSED SUCCESSFULLY! ===");
}

testRbacFlow()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

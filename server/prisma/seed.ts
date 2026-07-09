import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding database...");

  // 1. Create Default Roles
  const roles = [
    { name: "SUPER_ADMIN", description: "مدير كامل الصلاحيات" },
    { name: "SALES_AGENT", description: "موظف مبيعات وكاشير" },
    { name: "ACCOUNTANT", description: "محاسب مالي" },
    { name: "INVENTORY_MANAGER", description: "أمين ومراقب مستودع" },
  ];

  const roleEntities = [];
  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    });
    roleEntities.push(role);
    console.log(`Role created/verified: ${role.name}`);
  }

  const superAdminRole = roleEntities.find((r) => r.name === "SUPER_ADMIN")!;

  // 2. Create Default Permissions
  const permissions = [
    { action: "products:create", description: "إنشاء المنتجات" },
    { action: "products:edit", description: "تعديل المنتجات" },
    { action: "products:delete", description: "حذف المنتجات" },
    { action: "sales:checkout", description: "إجراء عملية بيع" },
    { action: "reports:view", description: "مشاهدة التقارير المالية" },
    { action: "users:manage", description: "إدارة المستخدمين" },
  ];

  for (const p of permissions) {
    const perm = await prisma.permission.upsert({
      where: { action: p.action },
      update: {},
      create: p,
    });

    // Map to Super Admin by default
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: perm.id,
      },
    });
  }
  console.log("Permissions created and mapped to SUPER_ADMIN.");

  // 3. Create Default Admin User & Employee
  const adminEmail = "admin@system.com";
  const passwordHash = await bcrypt.hash("admin123", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      passwordHash,
    },
  });

  await prisma.employee.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      firstName: "أحمد",
      lastName: "عبد الله",
      phone: "0501234567",
      userId: adminUser.id,
      roleId: superAdminRole.id,
    },
  });
  console.log(`Default Admin Account: ${adminEmail} / admin123`);

  // 4. Create Default Warehouse
  const defaultWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH-MAIN" },
    update: {
      name: "المستودع الرئيسي (بغداد)",
      location: "بغداد، الكرادة",
    },
    create: {
      name: "المستودع الرئيسي (بغداد)",
      code: "WH-MAIN",
      location: "بغداد، الكرادة",
    },
  });
  console.log(`Default Warehouse created: ${defaultWarehouse.name}`);

  // 4.5 Create Default Category
  const defaultCategory = await prisma.category.upsert({
    where: { slug: "general" },
    update: {},
    create: {
      name: "عام",
      slug: "general",
      description: "القسم العام الافتراضي للمنتجات",
    },
  });
  console.log(`Default Category created: ${defaultCategory.name}`);

  // 5. Create Default Settings
  const settings = [
    { key: "COMPANY_NAME", value: "شركة النهرين للاستيراد والتصدير" },
    { key: "TAX_NUMBER", value: "100200300" },
    { key: "TAX_RATE", value: "0" },
    { key: "DEFAULT_COUNTRY", value: "IQ" },
    { key: "DEFAULT_CURRENCY", value: "IQD" },
    { key: "SUPPORTED_CURRENCIES", value: JSON.stringify([
      { code: "IQD", symbol: "د.ع", rate: 1.0 },
      { code: "USD", symbol: "$", rate: 0.00076 }
    ]) },
    { key: "INVOICE_NUMBERING_PREFIX", value: "IQ-INV-" },
    { key: "INVOICE_FORMAT", value: "STANDARD" },
    { key: "DATE_FORMAT", value: "YYYY-MM-DD" },
    { key: "TIME_ZONE", value: "Asia/Baghdad" },
    { key: "NUMBER_FORMATTING_LOCALE", value: "ar-IQ" },
    { key: "LANGUAGE_SETTING", value: "ar" },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log("Global company settings seeded.");

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

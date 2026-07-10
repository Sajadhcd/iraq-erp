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
    { action: "accounting:view", description: "عرض القوائم المالية وشجرة الحسابات" },
    { action: "accounting:manage", description: "إدارة القيود والسندات والحسابات" },
    { action: "accounting:post", description: "ترحيل القيود اليومية" },
    { action: "crm:view", description: "مشاهدة نظام إدارة علاقات العملاء" },
    { action: "crm:create", description: "إنشاء عملاء محتملين" },
    { action: "crm:edit", description: "تعديل عملاء محتملين" },
    { action: "crm:delete", description: "حذف عملاء محتملين" },
    { action: "crm:assign", description: "إسناد العملاء المحتملين والصفقات" },
    { action: "crm:convert", description: "تحويل العملاء المحتملين إلى فرص" },
    { action: "quotations:view", description: "عرض العروض المالية" },
    { action: "quotations:create", description: "إنشاء عروض الأسعار" },
    { action: "quotations:edit", description: "تعديل عروض الأسعار" },
    { action: "quotations:delete", description: "حذف عروض الأسعار" },
    { action: "quotations:approve", description: "اعتماد ورفض وتحويل العروض" },
    { action: "quotations:print", description: "طباعة وتصدير عروض الأسعار" },
    { action: "hr:view", description: "عرض الموظفين والأقسام والوظائف" },
    { action: "hr:create", description: "إنشاء الموظفين والهيكل الإداري" },
    { action: "hr:edit", description: "تعديل بيانات الموظفين والوظائف" },
    { action: "hr:delete", description: "حذف الموظفين أو إزالتهم من الخدمة" },
    { action: "hr:documents", description: "رفع وإدارة وثائق ومستندات الموظف" },
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

  // 6. Create Default Chart of Accounts
  console.log("Seeding Chart of Accounts...");
  
  const rootAccounts = [
    { code: "100000", nameEn: "Assets", nameAr: "الأصول", type: "ASSET" },
    { code: "200000", nameEn: "Liabilities", nameAr: "الالتحامات", type: "LIABILITY" },
    { code: "300000", nameEn: "Equity", nameAr: "حقوق الملكية", type: "EQUITY" },
    { code: "400000", nameEn: "Revenue", nameAr: "الإيرادات", type: "REVENUE" },
    { code: "500000", nameEn: "Expenses", nameAr: "المصروفات", type: "EXPENSE" },
  ];

  const rootEntities: Record<string, any> = {};
  for (const root of rootAccounts) {
    const acc = await prisma.account.upsert({
      where: { code: root.code },
      update: {},
      create: {
        code: root.code,
        nameEn: root.nameEn,
        nameAr: root.nameAr,
        type: root.type as any,
        isActive: true,
      },
    });
    rootEntities[root.type] = acc;
  }

  const childAccounts = [
    // Assets
    { code: "101000", nameEn: "Cash on Hand", nameAr: "الخزينة/النقدية بالخزينة", type: "ASSET", parentType: "ASSET", isCashOrBank: true, cashBankType: "CASH" },
    { code: "102000", nameEn: "Bank Account", nameAr: "الحساب البنكي", type: "ASSET", parentType: "ASSET", isCashOrBank: true, cashBankType: "BANK" },
    { code: "110000", nameEn: "Accounts Receivable", nameAr: "ذمم عملاء مدينون", type: "ASSET", parentType: "ASSET" },
    { code: "120000", nameEn: "Inventory Asset", nameAr: "مخزون السلع والبضائع", type: "ASSET", parentType: "ASSET" },
    
    // Liabilities
    { code: "210000", nameEn: "Accounts Payable", nameAr: "ذمم موردين دائنون", type: "LIABILITY", parentType: "LIABILITY" },
    { code: "220000", nameEn: "Tax Payable", nameAr: "حساب ضريبة القيمة المضافة المستحقة", type: "LIABILITY", parentType: "LIABILITY" },
    
    // Equity
    { code: "301000", nameEn: "Capital / Retained Earnings", nameAr: "رأس المال / الأرباح المحتجزة", type: "EQUITY", parentType: "EQUITY" },
    
    // Revenue
    { code: "401000", nameEn: "Sales Revenue", nameAr: "إيرادات المبيعات", type: "REVENUE", parentType: "REVENUE" },
    
    // Expenses
    { code: "501000", nameEn: "Cost of Goods Sold (COGS)", nameAr: "تكلفة البضاعة المباعة", type: "EXPENSE", parentType: "EXPENSE" },
    { code: "502000", nameEn: "General & Administrative Expenses", nameAr: "المصروفات العمومية والإدارية", type: "EXPENSE", parentType: "EXPENSE" },
    { code: "503000", nameEn: "Inventory Adjustment Loss/Gain", nameAr: "فروقات وتعديلات المخزون", type: "EXPENSE", parentType: "EXPENSE" },
  ];

  for (const child of childAccounts) {
    await prisma.account.upsert({
      where: { code: child.code },
      update: {},
      create: {
        code: child.code,
        nameEn: child.nameEn,
        nameAr: child.nameAr,
        type: child.type as any,
        parentId: rootEntities[child.parentType].id,
        isCashOrBank: child.isCashOrBank || false,
        cashBankType: child.cashBankType || null,
        isActive: true,
      },
    });
  }
  console.log("Chart of Accounts seeded.");

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

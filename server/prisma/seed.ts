import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding enterprise RBAC database...");

  // 1. Create Default Roles
  const roles = [
    { name: "SUPER_ADMIN", description: "مدير النظام كامل الصلاحيات / Full System Administrator" },
    { name: "ADMIN", description: "مدير النظام العام / General Administrator" },
    { name: "HR_MANAGER", description: "مدير الموارد البشرية / HR Manager" },
    { name: "HR_EMPLOYEE", description: "موظف الموارد البشرية / HR Employee" },
    { name: "SALES_MANAGER", description: "مدير المبيعات / Sales Manager" },
    { name: "SALES_AGENT", description: "مندوب مبيعات / Sales Agent" },
    { name: "PURCHASE_MANAGER", description: "مدير المشتريات / Purchase Manager" },
    { name: "PURCHASING_OFFICER", description: "موظف المشتريات / Purchasing Officer" },
    { name: "INVENTORY_MANAGER", description: "مدير المستودعات / Inventory Manager" },
    { name: "WAREHOUSE_EMPLOYEE", description: "موظف مستودع / Warehouse Employee" },
    { name: "ACCOUNTING_MANAGER", description: "مدير الحسابات / Accounting Manager" },
    { name: "ACCOUNTANT", description: "محاسب / Accountant" },
    { name: "CASHIER", description: "أمين صندوق مبيعات / Cashier" },
    { name: "CUSTOMER_SERVICE", description: "خدمة العملاء / Customer Service" },
    { name: "MARKETING", description: "التسويق / Marketing" },
    { name: "EMPLOYEE", description: "موظف عام / Employee" },
    { name: "AUDITOR", description: "مدقق حسابات / Auditor" },
  ];

  const roleEntities: Record<string, any> = {};
  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    });
    roleEntities[r.name] = role;
    console.log(`Role created/verified: ${role.name}`);
  }

  // 2. Create Default Permissions
  const permissions = [
    // Products
    { action: "products:view", description: "عرض المنتجات" },
    { action: "products:create", description: "إنشاء المنتجات" },
    { action: "products:edit", description: "تعديل المنتجات" },
    { action: "products:delete", description: "حذف المنتجات" },
    // POS / Sales
    { action: "sales:checkout", description: "إجراء عملية بيع" },
    { action: "sales:view", description: "عرض المبيعات" },
    // Reports
    { action: "reports:view", description: "مشاهدة التقارير المالية" },
    // Users Management
    { action: "users:manage", description: "إدارة المستخدمين" },
    // Accounting
    { action: "accounting:view", description: "عرض القوائم المالية وشجرة الحسابات" },
    { action: "accounting:manage", description: "إدارة القيود والسندات والحسابات" },
    { action: "accounting:post", description: "ترحيل القيود اليومية" },
    // CRM
    { action: "crm:view", description: "مشاهدة نظام إدارة علاقات العملاء" },
    { action: "crm:create", description: "إنشاء عملاء محتملين" },
    { action: "crm:edit", description: "تعديل عملاء محتملين" },
    { action: "crm:delete", description: "حذف عملاء محتملين" },
    { action: "crm:assign", description: "إسناد العملاء المحتملين والصفقات" },
    { action: "crm:convert", description: "تحويل العملاء المحتملين إلى فرص" },
    // Quotations
    { action: "quotations:view", description: "عرض العروض المالية" },
    { action: "quotations:create", description: "إنشاء عروض الأسعار" },
    { action: "quotations:edit", description: "تعديل عروض الأسعار" },
    { action: "quotations:delete", description: "حذف عروض الأسعار" },
    { action: "quotations:approve", description: "اعتماد ورفض وتحويل العروض" },
    { action: "quotations:print", description: "طباعة وتصدير عروض الأسعار" },
    // Sales Orders
    { action: "sales_orders:view", description: "عرض أوامر البيع والتسليم" },
    { action: "sales_orders:manage", description: "إدارة وتأكيد أوامر البيع" },
    // HRMS
    { action: "hr:view", description: "عرض الموظفين والأقسام والوظائف" },
    { action: "employees:view", description: "عرض سجلات الموظفين" },
    { action: "hr:create", description: "إنشاء الموظفين والهيكل الإداري" },
    { action: "hr:edit", description: "تعديل بيانات الموظفين والوظائف" },
    { action: "hr:delete", description: "حذف الموظفين أو إزالتهم من الخدمة" },
    { action: "hr:documents", description: "رفع وإدارة وثائق ومستندات الموظف" },
    // Attendance
    { action: "attendance:view", description: "عرض سجل الحضور" },
    { action: "attendance:manage", description: "إدارة سياسات وسجلات الحضور" },
    // Leave
    { action: "leave:view", description: "عرض طلبات الإجازة" },
    { action: "leave:manage", description: "إدارة واعتماد طلبات الإجازة" },
    // Payroll
    { action: "payroll:view", description: "عرض مسيرات وقسائم الرواتب" },
    { action: "payroll:manage", description: "إدارة وتشغيل وهياكل الرواتب" },
    // Purchasing
    { action: "purchasing:view", description: "عرض المشتريات والموردين" },
    { action: "purchasing:manage", description: "إدارة فواتير المشتريات والموردين" },
    // Inventory
    { action: "inventory:view", description: "عرض المخزون والمستودعات" },
    { action: "inventory:manage", description: "إدارة المخزون والتسويات" },
    // Dashboard
    { action: "dashboard:view", description: "عرض لوحة القيادة والمؤشرات" },
    // Customers
    { action: "customers:view", description: "عرض العملاء" },
    { action: "customers:create", description: "إنشاء العملاء" },
    { action: "customers:update", description: "تعديل العملاء" },
    { action: "customers:delete", description: "حذف العملاء" },
    // Suppliers
    { action: "suppliers:view", description: "عرض الموردين" },
    { action: "suppliers:create", description: "إنشاء الموردين" },
    { action: "suppliers:update", description: "تعديل الموردين" },
    { action: "suppliers:delete", description: "حذف الموردين" },
    // Settings
    { action: "settings:view", description: "عرض إعدادات النظام" },
    { action: "settings:manage", description: "إدارة إعدادات النظام" },
  ];

  const permEntities: Record<string, any> = {};
  for (const p of permissions) {
    const perm = await prisma.permission.upsert({
      where: { action: p.action },
      update: { description: p.description },
      create: p,
    });
    permEntities[p.action] = perm;
  }
  console.log("Permissions seeded successfully.");

  // Helper to map permissions to roles
  const mapPermissionsToRole = async (roleName: string, actions: string[]) => {
    const role = roleEntities[roleName];
    if (!role) return;

    for (const action of actions) {
      const perm = permEntities[action];
      if (!perm) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }
    console.log(`Mapped ${actions.length} permissions to role: ${roleName}`);
  };

  // Map permissions to roles
  const allActions = permissions.map(p => p.action);

  // 1. SUPER_ADMIN gets all
  await mapPermissionsToRole("SUPER_ADMIN", allActions);

  // 2. ADMIN gets everything except system user overrides (users:manage)
  const adminActions = allActions.filter(act => act !== "users:manage");
  await mapPermissionsToRole("ADMIN", adminActions);

  // 3. HR_MANAGER
  await mapPermissionsToRole("HR_MANAGER", [
    "hr:view", "employees:view", "hr:create", "hr:edit", "hr:delete", "hr:documents",
    "attendance:view", "attendance:manage",
    "leave:view", "leave:manage",
    "payroll:view", "payroll:manage",
    "reports:view", "dashboard:view", "settings:view"
  ]);

  // 4. HR_EMPLOYEE
  await mapPermissionsToRole("HR_EMPLOYEE", [
    "hr:view", "employees:view", "hr:create", "hr:edit", "hr:documents",
    "attendance:view", "attendance:manage",
    "leave:view", "leave:manage", "dashboard:view"
  ]);

  // 5. SALES_MANAGER
  await mapPermissionsToRole("SALES_MANAGER", [
    "crm:view", "crm:create", "crm:edit", "crm:delete", "crm:assign", "crm:convert",
    "quotations:view", "quotations:create", "quotations:edit", "quotations:delete", "quotations:approve", "quotations:print",
    "sales_orders:view", "sales_orders:manage",
    "sales:checkout", "sales:view",
    "reports:view", "dashboard:view", "settings:view",
    "customers:view", "customers:create", "customers:update", "customers:delete",
    "suppliers:view"
  ]);

  // 6. SALES_AGENT
  await mapPermissionsToRole("SALES_AGENT", [
    "crm:view", "crm:create", "crm:edit",
    "quotations:view", "quotations:create", "quotations:edit",
    "sales_orders:view",
    "sales:checkout", "dashboard:view",
    "customers:view", "customers:create", "customers:update"
  ]);

  // 7. PURCHASE_MANAGER
  await mapPermissionsToRole("PURCHASE_MANAGER", [
    "purchasing:view", "purchasing:manage",
    "products:view",
    "reports:view", "dashboard:view",
    "suppliers:view", "suppliers:create", "suppliers:update", "suppliers:delete"
  ]);

  // 8. PURCHASING_OFFICER
  await mapPermissionsToRole("PURCHASING_OFFICER", [
    "purchasing:view", "purchasing:manage",
    "products:view",
    "suppliers:view", "suppliers:create", "suppliers:update"
  ]);

  // 9. INVENTORY_MANAGER
  await mapPermissionsToRole("INVENTORY_MANAGER", [
    "products:view", "products:create", "products:edit", "products:delete",
    "inventory:view", "inventory:manage",
    "reports:view", "dashboard:view"
  ]);

  // 10. WAREHOUSE_EMPLOYEE
  await mapPermissionsToRole("WAREHOUSE_EMPLOYEE", [
    "inventory:view", "inventory:manage",
    "products:view"
  ]);

  // 11. ACCOUNTING_MANAGER
  await mapPermissionsToRole("ACCOUNTING_MANAGER", [
    "accounting:view", "accounting:manage", "accounting:post",
    "reports:view",
    "payroll:view", "employees:view", "dashboard:view", "settings:view",
    "customers:view", "suppliers:view"
  ]);

  // 12. ACCOUNTANT
  await mapPermissionsToRole("ACCOUNTANT", [
    "accounting:view", "accounting:manage",
    "payroll:view", "employees:view", "dashboard:view", "settings:view",
    "customers:view", "suppliers:view"
  ]);

  // 13. CASHIER
  await mapPermissionsToRole("CASHIER", [
    "sales:checkout", "sales:view", "dashboard:view",
    "customers:view", "customers:create",
    "products:view", "settings:view"
  ]);

  // 14. CUSTOMER_SERVICE
  await mapPermissionsToRole("CUSTOMER_SERVICE", [
    "crm:view", "crm:edit", "dashboard:view", "customers:view"
  ]);

  // 15. MARKETING
  await mapPermissionsToRole("MARKETING", [
    "crm:view", "crm:create", "dashboard:view"
  ]);

  // 16. EMPLOYEE
  await mapPermissionsToRole("EMPLOYEE", [
    "attendance:view",
    "leave:view",
    "payroll:view", "dashboard:view"
  ]);

  // 17. AUDITOR
  await mapPermissionsToRole("AUDITOR", [
    "reports:view",
    "accounting:view",
    "sales:view", "dashboard:view", "customers:view", "suppliers:view", "settings:view",
    "purchasing:view",
    "inventory:view"
  ]);

  // 3. Create Default Admin User & Employee if not exists
  const adminEmail = "admin@system.com";
  const passwordHash = await bcrypt.hash("123456", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, username: "admin" },
    create: {
      email: adminEmail,
      username: "admin",
      passwordHash,
    },
  });

  const superAdminRole = roleEntities["SUPER_ADMIN"];
  await prisma.employee.upsert({
    where: { userId: adminUser.id },
    update: { roleId: superAdminRole.id },
    create: {
      firstName: "أحمد",
      lastName: "عبد الله",
      phone: "0501234567",
      userId: adminUser.id,
      roleId: superAdminRole.id,
    },
  });
  console.log(`Default Admin Account: ${adminEmail} / 123456`);

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
    { code: "101000", nameEn: "Cash on Hand", nameAr: "الخزينة/النقدية بالخزينة", type: "ASSET", parentType: "ASSET", isCashOrBank: true, cashBankType: "CASH" },
    { code: "102000", nameEn: "Bank Account", nameAr: "الحساب البنكي", type: "ASSET", parentType: "ASSET", isCashOrBank: true, cashBankType: "BANK" },
    { code: "110000", nameEn: "Accounts Receivable", nameAr: "ذمم عملاء مدينون", type: "ASSET", parentType: "ASSET" },
    { code: "120000", nameEn: "Inventory Asset", nameAr: "مخزون السلع والبضائع", type: "ASSET", parentType: "ASSET" },
    { code: "210000", nameEn: "Accounts Payable", nameAr: "ذمم موردين دائنون", type: "LIABILITY", parentType: "LIABILITY" },
    { code: "220000", nameEn: "Tax Payable", nameAr: "حساب ضريبة القيمة المضافة المستحقة", type: "LIABILITY", parentType: "LIABILITY" },
    { code: "301000", nameEn: "Capital / Retained Earnings", nameAr: "رأس المال / الأرباح المحتجزة", type: "EQUITY", parentType: "EQUITY" },
    { code: "401000", nameEn: "Sales Revenue", nameAr: "إيرادات المبيعات", type: "REVENUE", parentType: "REVENUE" },
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

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
    { name: "INVENTORY_MANAGER", description: "مدير المستودعات / Inventory Manager" },
    { name: "ACCOUNTANT", description: "محاسب / Accountant" },
    { name: "CASHIER", description: "أمين صندوق مبيعات / Cashier" },
    { name: "EMPLOYEE", description: "موظف عام / Employee" },
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

  // 1. SUPER_ADMIN gets all permissions
  const allActions = permissions.map(p => p.action);
  await mapPermissionsToRole("SUPER_ADMIN", allActions);

  // 2. ADMIN gets everything except system user management settings (users:manage)
  const adminActions = allActions.filter(act => act !== "users:manage");
  await mapPermissionsToRole("ADMIN", adminActions);

  // 3. HR_MANAGER gets employees, attendance, leaves, payroll
  await mapPermissionsToRole("HR_MANAGER", [
    "hr:view", "hr:create", "hr:edit", "hr:delete", "hr:documents",
    "attendance:view", "attendance:manage",
    "leave:view", "leave:manage",
    "payroll:view", "payroll:manage"
  ]);

  // 4. HR_EMPLOYEE gets employees, attendance, leaves
  await mapPermissionsToRole("HR_EMPLOYEE", [
    "hr:view", "hr:create", "hr:edit", "hr:documents",
    "attendance:view", "attendance:manage",
    "leave:view", "leave:manage"
  ]);

  // 5. SALES_MANAGER gets CRM, Quotations, Sales Orders, POS, Customers
  await mapPermissionsToRole("SALES_MANAGER", [
    "crm:view", "crm:create", "crm:edit", "crm:delete", "crm:assign", "crm:convert",
    "quotations:view", "quotations:create", "quotations:edit", "quotations:delete", "quotations:approve", "quotations:print",
    "sales_orders:view", "sales_orders:manage",
    "sales:checkout", "sales:view",
    "reports:view"
  ]);

  // 6. SALES_AGENT gets CRM, Quotations, POS
  await mapPermissionsToRole("SALES_AGENT", [
    "crm:view", "crm:create", "crm:edit",
    "quotations:view", "quotations:create", "quotations:edit",
    "sales:checkout"
  ]);

  // 7. PURCHASE_MANAGER gets suppliers, purchase orders, receiving
  await mapPermissionsToRole("PURCHASE_MANAGER", [
    "purchasing:view", "purchasing:manage",
    "products:view"
  ]);

  // 8. INVENTORY_MANAGER gets warehouses, products, stock transfers/adjustments
  await mapPermissionsToRole("INVENTORY_MANAGER", [
    "products:view", "products:create", "products:edit", "products:delete",
    "inventory:view", "inventory:manage"
  ]);

  // 9. ACCOUNTANT gets accounting, journal entries, reports, expenses
  await mapPermissionsToRole("ACCOUNTANT", [
    "accounting:view", "accounting:manage", "accounting:post",
    "reports:view",
    "payroll:view"
  ]);

  // 10. CASHIER gets POS and payments
  await mapPermissionsToRole("CASHIER", [
    "sales:checkout"
  ]);

  // 11. EMPLOYEE gets minimal view access
  await mapPermissionsToRole("EMPLOYEE", [
    "attendance:view",
    "leave:view"
  ]);

  // 3. Create Default Admin User & Employee if not exists
  const adminEmail = "admin@system.com";
  const passwordHash = await bcrypt.hash("admin123", 10);

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

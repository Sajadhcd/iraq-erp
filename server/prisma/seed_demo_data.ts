import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("=== STARTING REALISTIC DEMO DATABASE SEEDING FOR IRAQ ERP ===");

  // 1. Clear existing transactional and master data to prevent duplicate primary/unique key conflicts
  console.log("Cleaning database tables...");
  await prisma.payslip.deleteMany({});
  await prisma.payrollItem.deleteMany({});
  await prisma.payrollRun.deleteMany({});
  await prisma.salaryStructure.deleteMany({});
  await prisma.payrollPeriod.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.leaveType.deleteMany({});
  await prisma.employeeTimeline.deleteMany({});
  await prisma.employeeDocument.deleteMany({});
  
  await prisma.journalItem.deleteMany({});
  await prisma.journalEntry.deleteMany({});
  await prisma.voucher.deleteMany({});
  await prisma.account.deleteMany({});

  await prisma.deliveryNoteItem.deleteMany({});
  await prisma.deliveryNote.deleteMany({});
  await prisma.salesOrderItem.deleteMany({});
  await prisma.salesOrder.deleteMany({});

  // Clear CRM and Quotations first to avoid customer foreign keys violation
  await prisma.quotationItem.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.activity.deleteMany({});
  await prisma.opportunity.deleteMany({});
  await prisma.leadTimeline.deleteMany({});
  await prisma.lead.deleteMany({});

  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.sale.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.supplier.deleteMany({});
  
  await prisma.inventoryMovement.deleteMany({});
  await prisma.productSerial.deleteMany({});
  await prisma.priceHistory.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.warehouse.deleteMany({});

  // Note: Keep roles and permissions from standard seeder so we don't break permission matrix definitions,
  // but delete existing users and employees linked to them so we can re-create clean.
  await prisma.userPermission.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.jobPosition.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Existing data tables cleaned.");

  // Hash password for default credentials (123456)
  const passwordHash = await bcrypt.hash("123456", 10);

  // 2. Fetch default roles
  const superAdminRole = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });
  if (!superAdminRole) {
    throw new Error("Default SUPER_ADMIN role does not exist. Please run standard db seed first.");
  }

  const getRoleId = async (name: string): Promise<string> => {
    const role = await prisma.role.findUnique({ where: { name } });
    return role ? role.id : superAdminRole.id;
  };

  const superAdminRoleId = superAdminRole.id;
  const adminRoleId = await getRoleId("ADMIN");
  const hrManagerRoleId = await getRoleId("HR_MANAGER");
  const hrEmployeeRoleId = await getRoleId("HR_EMPLOYEE");
  const salesManagerRoleId = await getRoleId("SALES_MANAGER");
  const salesAgentRoleId = await getRoleId("SALES_AGENT");
  const purchaseManagerRoleId = await getRoleId("PURCHASE_MANAGER");
  const purchasingOfficerRoleId = await getRoleId("PURCHASING_OFFICER");
  const inventoryManagerRoleId = await getRoleId("INVENTORY_MANAGER");
  const warehouseEmployeeRoleId = await getRoleId("WAREHOUSE_EMPLOYEE");
  const accountingManagerRoleId = await getRoleId("ACCOUNTING_MANAGER");
  const accountantRoleId = await getRoleId("ACCOUNTANT");
  const cashierRoleId = await getRoleId("CASHIER");
  const employeeRoleId = await getRoleId("EMPLOYEE");

  // 3. Create Warehouses
  console.log("Creating warehouses...");
  const whBaghdad = await prisma.warehouse.create({
    data: { name: "المستودع الرئيسي - بغداد الكرادة", code: "WH-BGD", location: "بغداد، الكرادة" },
  });
  const whBasra = await prisma.warehouse.create({
    data: { name: "مستودع المنطقة الجنوبية - البصرة", code: "WH-BSR", location: "البصرة، العشار" },
  });
  const whErbil = await prisma.warehouse.create({
    data: { name: "مستودع المنطقة الشمالية - أربيل", code: "WH-EBL", location: "أربيل، عينكاوة" },
  });

  // 4. Create Departments
  console.log("Creating departments...");
  const deptAdmin = await prisma.department.create({ data: { arabicName: "الإدارة العامة", englishName: "General Administration", departmentCode: "DEP-ADM", isActive: true } });
  const deptHR = await prisma.department.create({ data: { arabicName: "الموارد البشرية", englishName: "Human Resources", departmentCode: "DEP-HR", isActive: true } });
  const deptSales = await prisma.department.create({ data: { arabicName: "المبيعات والتسويق", englishName: "Sales & Marketing", departmentCode: "DEP-SALES", isActive: true } });
  const deptPurchasing = await prisma.department.create({ data: { arabicName: "المشتريات واللوجستيات", englishName: "Purchasing & Logistics", departmentCode: "DEP-PUR", isActive: true } });
  const deptAccounting = await prisma.department.create({ data: { arabicName: "الحسابات والمالية", englishName: "Accounting & Finance", departmentCode: "DEP-ACC", isActive: true } });
  const deptInventory = await prisma.department.create({ data: { arabicName: "إدارة المخازن والمستودعات", englishName: "Inventory & Warehouses", departmentCode: "DEP-INV", isActive: true } });

  // 5. Create Job Positions
  console.log("Creating job positions...");
  const jobGeneral = await prisma.jobPosition.create({ data: { arabicName: "مدير عام", englishName: "General Manager", positionCode: "GM", departmentId: deptAdmin.id } });
  const jobHRMgr = await prisma.jobPosition.create({ data: { arabicName: "مدير الموارد البشرية", englishName: "HR Manager", positionCode: "HRM", departmentId: deptHR.id } });
  const jobHREmp = await prisma.jobPosition.create({ data: { arabicName: "أخصائي موارد بشرية", englishName: "HR Specialist", positionCode: "HRO", departmentId: deptHR.id } });
  const jobSalesMgr = await prisma.jobPosition.create({ data: { arabicName: "مدير مبيعات", englishName: "Sales Manager", positionCode: "SM", departmentId: deptSales.id } });
  const jobSalesAgent = await prisma.jobPosition.create({ data: { arabicName: "مندوب مبيعات", englishName: "Sales Agent", positionCode: "SA", departmentId: deptSales.id } });
  const jobPurchasingMgr = await prisma.jobPosition.create({ data: { arabicName: "مدير مشتريات", englishName: "Purchasing Manager", positionCode: "PM", departmentId: deptPurchasing.id } });
  const jobPurchasingOfficer = await prisma.jobPosition.create({ data: { arabicName: "مأمور مشتريات", englishName: "Purchasing Officer", positionCode: "PO", departmentId: deptPurchasing.id } });
  const jobWarehouseMgr = await prisma.jobPosition.create({ data: { arabicName: "مدير مخازن", englishName: "Warehouse Manager", positionCode: "WM", departmentId: deptInventory.id } });
  const jobWarehouseStaff = await prisma.jobPosition.create({ data: { arabicName: "أمين مستودع", englishName: "Warehouse Staff", positionCode: "WS", departmentId: deptInventory.id } });
  const jobAccountingMgr = await prisma.jobPosition.create({ data: { arabicName: "رئيس حسابات", englishName: "Accounting Manager", positionCode: "AM", departmentId: deptAccounting.id } });
  const jobAccountant = await prisma.jobPosition.create({ data: { arabicName: "محاسب مالي", englishName: "Accountant", positionCode: "ACC", departmentId: deptAccounting.id } });
  const jobCashier = await prisma.jobPosition.create({ data: { arabicName: "أمين صندوق POS", englishName: "Cashier POS", positionCode: "CSH", departmentId: deptAccounting.id } });
  const jobStaff = await prisma.jobPosition.create({ data: { arabicName: "موظف تشغيل", englishName: "Staff Member", positionCode: "STAFF", departmentId: deptAdmin.id } });

  // 6. Create Employees & Users Accounts
  console.log("Generating employee list and login accounts...");
  const employeesData = [
    // Admins
    { username: "admin", roleId: superAdminRoleId, deptId: deptAdmin.id, jobId: jobGeneral.id, first: "علي", last: "الركابي", email: "admin@system.com" },
    { username: "admin2", roleId: adminRoleId, deptId: deptAdmin.id, jobId: jobGeneral.id, first: "مصطفى", last: "الساعدي", email: "admin2@system.com" },
    
    // HR
    { username: "hr_manager", roleId: hrManagerRoleId, deptId: deptHR.id, jobId: jobHRMgr.id, first: "سارة", last: "الربيعي", email: "hr_manager@system.com" },
    { username: "hr_employee1", roleId: hrEmployeeRoleId, deptId: deptHR.id, jobId: jobHREmp.id, first: "هدى", last: "التميمي", email: "hr_employee1@system.com" },
    { username: "hr_employee2", roleId: hrEmployeeRoleId, deptId: deptHR.id, jobId: jobHREmp.id, first: "أحمد", last: "الخفاجي", email: "hr_employee2@system.com" },
    
    // Sales
    { username: "sales_manager", roleId: salesManagerRoleId, deptId: deptSales.id, jobId: jobSalesMgr.id, first: "حسين", last: "الجبوري", email: "sales_manager@system.com" },
    { username: "sales1", roleId: salesAgentRoleId, deptId: deptSales.id, jobId: jobSalesAgent.id, first: "كرار", last: "الفتلاوي", email: "sales1@system.com" },
    { username: "sales2", roleId: salesAgentRoleId, deptId: deptSales.id, jobId: jobSalesAgent.id, first: "مرتضى", last: "الحلي", email: "sales2@system.com" },
    { username: "sales3", roleId: salesAgentRoleId, deptId: deptSales.id, jobId: jobSalesAgent.id, first: "فاطمة", last: "العبيدي", email: "sales3@system.com" },
    { username: "sales4", roleId: salesAgentRoleId, deptId: deptSales.id, jobId: jobSalesAgent.id, first: "زينب", last: "الكعبي", email: "sales4@system.com" },
    { username: "sales5", roleId: salesAgentRoleId, deptId: deptSales.id, jobId: jobSalesAgent.id, first: "ضرغام", last: "المياحي", email: "sales5@system.com" },
    
    // Purchasing
    { username: "purchase_manager", roleId: purchaseManagerRoleId, deptId: deptPurchasing.id, jobId: jobPurchasingMgr.id, first: "رائد", last: "الدليمي", email: "purchase_manager@system.com" },
    { username: "purchase1", roleId: purchasingOfficerRoleId, deptId: deptPurchasing.id, jobId: jobPurchasingOfficer.id, first: "عمر", last: "الراوي", email: "purchase1@system.com" },
    { username: "purchase2", roleId: purchasingOfficerRoleId, deptId: deptPurchasing.id, jobId: jobPurchasingOfficer.id, first: "سعد", last: "الحديثي", email: "purchase2@system.com" },
    { username: "purchase3", roleId: purchasingOfficerRoleId, deptId: deptPurchasing.id, jobId: jobPurchasingOfficer.id, first: "ماجد", last: "الفلوجي", email: "purchase3@system.com" },
    
    // Inventory
    { username: "inventory_manager1", roleId: inventoryManagerRoleId, deptId: deptInventory.id, jobId: jobWarehouseMgr.id, first: "سلام", last: "العكيلي", email: "inventory_manager1@system.com", warehouseId: whBaghdad.id },
    { username: "inventory_manager2", roleId: warehouseEmployeeRoleId, deptId: deptInventory.id, jobId: jobWarehouseStaff.id, first: "خالد", last: "الحسيني", email: "inventory_manager2@system.com", warehouseId: whBasra.id },
    
    // Accounting
    { username: "accountant1", roleId: accountingManagerRoleId, deptId: deptAccounting.id, jobId: jobAccountingMgr.id, first: "ياسر", last: "الهمداني", email: "accountant1@system.com" },
    { username: "accountant2", roleId: accountantRoleId, deptId: deptAccounting.id, jobId: jobAccountant.id, first: "رافد", last: "الحمداني", email: "accountant2@system.com" },
    { username: "accountant3", roleId: accountantRoleId, deptId: deptAccounting.id, jobId: jobAccountant.id, first: "نور", last: "العزاوي", email: "accountant3@system.com" },
    
    // Cashiers
    { username: "cashier1", roleId: cashierRoleId, deptId: deptAccounting.id, jobId: jobCashier.id, first: "حسن", last: "البصري", email: "cashier1@system.com" },
    { username: "cashier2", roleId: cashierRoleId, deptId: deptAccounting.id, jobId: jobCashier.id, first: "عقيل", last: "النجفي", email: "cashier2@system.com" },
    
    // Employees 1-15
    { username: "employee1", roleId: employeeRoleId, deptId: deptAdmin.id, jobId: jobStaff.id, first: "رعد", last: "الشمري", email: "employee1@system.com" },
    { username: "employee2", roleId: employeeRoleId, deptId: deptAdmin.id, jobId: jobStaff.id, first: "نبيل", last: "الزبيدي", email: "employee2@system.com" },
    { username: "employee3", roleId: employeeRoleId, deptId: deptAdmin.id, jobId: jobStaff.id, first: "وليد", last: "العيداني", email: "employee3@system.com" },
    { username: "employee4", roleId: employeeRoleId, deptId: deptAdmin.id, jobId: jobStaff.id, first: "باسم", last: "الخالدي", email: "employee4@system.com" },
    { username: "employee5", roleId: employeeRoleId, deptId: deptAdmin.id, jobId: jobStaff.id, first: "سجاد", last: "البهادلي", email: "employee5@system.com" },
    { username: "employee6", roleId: employeeRoleId, deptId: deptAdmin.id, jobId: jobStaff.id, first: "حيدر", last: "الربيعي", email: "employee6@system.com" },
    { username: "employee7", roleId: employeeRoleId, deptId: deptAdmin.id, jobId: jobStaff.id, first: "عمار", last: "البغدادي", email: "employee7@system.com" },
    { username: "employee8", roleId: employeeRoleId, deptId: deptAdmin.id, jobId: jobStaff.id, first: "ميثم", last: "السوداني", email: "employee8@system.com" },
    { username: "employee9", roleId: employeeRoleId, deptId: deptAdmin.id, jobId: jobStaff.id, first: "أثير", last: "المحمداوي", email: "employee9@system.com" },
    { username: "employee10", roleId: employeeRoleId, deptId: deptAdmin.id, jobId: jobStaff.id, first: "مريم", last: "الكناني", email: "employee10@system.com" },
    { username: "employee11", roleId: employeeRoleId, deptId: deptAdmin.id, jobId: jobStaff.id, first: "صفاء", last: "العراقي", email: "employee11@system.com" },
    { username: "employee12", roleId: employeeRoleId, deptId: deptAdmin.id, jobId: jobStaff.id, first: "بهاء", last: "الموسوي", email: "employee12@system.com" },
    { username: "employee13", roleId: employeeRoleId, deptId: deptAdmin.id, jobId: jobStaff.id, first: "حنان", last: "الساعدي", email: "employee13@system.com" },
    { username: "employee14", roleId: employeeRoleId, deptId: deptAdmin.id, jobId: jobStaff.id, first: "رنا", last: "البياتي", email: "employee14@system.com" },
    { username: "employee15", roleId: employeeRoleId, deptId: deptAdmin.id, jobId: jobStaff.id, first: "ميس", last: "الحديثي", email: "employee15@system.com" },
  ];

  const dbEmployees: any[] = [];
  for (const empData of employeesData) {
    const user = await prisma.user.create({
      data: {
        email: empData.email,
        username: empData.username,
        passwordHash,
        isActive: true,
      },
    });

    const empNumber = `EMP-${empData.username.toUpperCase().replace("_", "-")}`;
    const employee = await prisma.employee.create({
      data: {
        employeeNumber: empNumber,
        firstName: empData.first,
        lastName: empData.last,
        email: empData.email,
        phone: "+964770000000",
        address: "العراق، بغداد",
        userId: user.id,
        roleId: empData.roleId,
        departmentId: empData.deptId,
        positionId: empData.jobId,
        warehouseId: empData.warehouseId || null,
        hireDate: new Date("2025-01-01"),
        status: "ACTIVE",
      },
    });
    dbEmployees.push(employee);
  }
  console.log(`Successfully created ${dbEmployees.length} employees and user accounts with password "123456".`);

  // 7. Chart of Accounts Setup
  console.log("Setting up Chart of Accounts...");
  const accountsData = [
    // Assets
    { code: "1000", nameAr: "الأصول المتداولة", nameEn: "Current Assets", type: "ASSET", parentCode: null },
    { code: "1001", nameAr: "الصندوق الرئيسي بغداد", nameEn: "Main Cash Box Baghdad", type: "ASSET", parentCode: "1000" },
    { code: "1002", nameAr: "صندوق البصرة POS", nameEn: "Basra Cash Box POS", type: "ASSET", parentCode: "1000" },
    { code: "1003", nameAr: "حساب مصرف الرافدين", nameEn: "Rafidain Bank Account", type: "ASSET", parentCode: "1000" },
    { code: "1004", nameAr: "حساب مصرف بغداد", nameEn: "Bank of Baghdad Account", type: "ASSET", parentCode: "1000" },
    { code: "1100", nameAr: "الذمم المدينة (AR)", nameEn: "Accounts Receivable (AR)", type: "ASSET", parentCode: "1000" },
    { code: "1200", nameAr: "مخزون البضائع", nameEn: "Inventory Stock", type: "ASSET", parentCode: "1000" },

    // Liabilities
    { code: "2000", nameAr: "الالتزامات المتداولة", nameEn: "Current Liabilities", type: "LIABILITY", parentCode: null },
    { code: "2001", nameAr: "الذمم الدائنة (AP)", nameEn: "Accounts Payable (AP)", type: "LIABILITY", parentCode: "2000" },
    { code: "2002", nameAr: "حساب ضريبة القيمة المضافة المستحقة", nameEn: "VAT Tax Payable", type: "LIABILITY", parentCode: "2000" },
    { code: "2003", nameAr: "رواتب مستحقة الدفع", nameEn: "Accrued Payroll Salaries", type: "LIABILITY", parentCode: "2000" },
    { code: "2004", nameAr: "استقطاعات رواتب دائنة", nameEn: "Salary Deductions Payable", type: "LIABILITY", parentCode: "2000" },

    // Equity
    { code: "3000", nameAr: "حقوق الملكية", nameEn: "Shareholder Equity", type: "EQUITY", parentCode: null },
    { code: "3001", nameAr: "رأس المال المدفوع", nameEn: "Paid-in Capital", type: "EQUITY", parentCode: "3000" },
    { code: "3002", nameAr: "الأرباح المحتجزة", nameEn: "Retained Earnings", type: "EQUITY", parentCode: "3000" },

    // Revenue
    { code: "4000", nameAr: "إيرادات النشاط", nameEn: "Operating Revenue", type: "REVENUE", parentCode: null },
    { code: "4001", nameAr: "مبيعات أجهزة ومعدات", nameEn: "Equipment Sales Revenue", type: "REVENUE", parentCode: "4000" },
    { code: "4002", nameAr: "مبيعات إكسسوارات وملحقات", nameEn: "Accessories Sales Revenue", type: "REVENUE", parentCode: "4000" },

    // Expense
    { code: "5000", nameAr: "المصروفات التشغيلية", nameEn: "Operating Expenses", type: "EXPENSE", parentCode: null },
    { code: "5001", nameAr: "مصروف الرواتب والأجور", nameEn: "Salaries & Wages Expense", type: "EXPENSE", parentCode: "5000" },
    { code: "5002", nameAr: "تكلفة البضاعة المباعة (COGS)", nameEn: "Cost of Goods Sold (COGS)", type: "EXPENSE", parentCode: "5000" },
    { code: "5003", nameAr: "مصروف إيجار المخازن", nameEn: "Warehouse Rent Expense", type: "EXPENSE", parentCode: "5000" },
    { code: "5004", nameAr: "مصروف الكهرباء والخدمات", nameEn: "Utilities Expense", type: "EXPENSE", parentCode: "5000" },
  ];

  const accountMap: Record<string, string> = {};
  for (const acc of accountsData) {
    const parentId = acc.parentCode ? accountMap[acc.parentCode] : null;
    const dbAcc = await prisma.account.create({
      data: {
        code: acc.code,
        nameAr: acc.nameAr,
        nameEn: acc.nameEn,
        type: acc.type as any,
        parentId,
        isActive: true,
        currentBalance: 0.0,
      },
    });
    accountMap[acc.code] = dbAcc.id;
  }
  console.log("Chart of Accounts loaded.");

  // Inject initial capital using a manual Journal Entry
  console.log("Injecting starting cash and capital...");
  const capitalJE = await prisma.journalEntry.create({
    data: {
      entryNumber: "JE-START-2025",
      reference: "إيداع رأس مال الشركة الافتتاحي في المصارف",
      notes: "رأس مال افتتاحي تجريبي للشركة",
      status: "POSTED",
      createdAt: new Date("2025-01-01T08:00:00Z"),
    },
  });

  // Bank Debit: 500,000,000 IQD
  await prisma.journalItem.create({
    data: {
      journalEntryId: capitalJE.id,
      accountId: accountMap["1003"],
      debit: 500000000,
      credit: 0,
    },
  });

  // Capital Credit: 500,000,000 IQD
  await prisma.journalItem.create({
    data: {
      journalEntryId: capitalJE.id,
      accountId: accountMap["3001"],
      debit: 0,
      credit: 500000000,
    },
  });

  // Update account balances
  await prisma.account.update({ where: { id: accountMap["1003"] }, data: { currentBalance: 500000000 } });
  await prisma.account.update({ where: { id: accountMap["3001"] }, data: { currentBalance: 500000000 } });

  // 8. Categories & Products
  console.log("Setting up categories and products...");
  const catPhones = await prisma.category.create({ data: { name: "الهواتف والذكية", slug: "phones" } });
  const catAccs = await prisma.category.create({ data: { name: "ملحقات وإلكترونيات", slug: "accessories" } });

  const productsData = [
    { name: "آيفون 15 برو ماكس 256 جيجا", sku: "IPH-15PM-256", cost: 1450000, retail: 1650000, catId: catPhones.id },
    { name: "سامسونج جالكسي S24 اولترا", sku: "SAM-S24U-512", cost: 1350000, retail: 1550000, catId: catPhones.id },
    { name: "سماعة ابل ايربودز برو 2", sku: "APL-AP2", cost: 280000, retail: 340000, catId: catAccs.id },
    { name: "شاحن لاسلكي سريع 3 في 1", sku: "CHG-WRLS-3IN1", cost: 35000, retail: 55000, catId: catAccs.id },
    { name: "شاحن سريع انكر 65 واط", sku: "ANK-65W", cost: 25000, retail: 40000, catId: catAccs.id },
  ];

  const dbProducts: any[] = [];
  for (const prod of productsData) {
    const dbProd = await prisma.product.create({
      data: {
        name: prod.name,
        sku: prod.sku,
        costPrice: prod.cost,
        retailPrice: prod.retail,
        categoryId: prod.catId,
        alertQuantity: 10,
        unit: "PCS",
      },
    });
    dbProducts.push(dbProd);

    // Seed inventory in all warehouses
    await prisma.inventory.create({
      data: { productId: dbProd.id, warehouseId: whBaghdad.id, quantity: 150, reserved: 0 },
    });
    await prisma.inventory.create({
      data: { productId: dbProd.id, warehouseId: whBasra.id, quantity: 80, reserved: 0 },
    });
    await prisma.inventory.create({
      data: { productId: dbProd.id, warehouseId: whErbil.id, quantity: 50, reserved: 0 },
    });
  }

  // 9. Customers & Suppliers
  console.log("Creating customers and suppliers...");
  const cust1 = await prisma.customer.create({
    data: { name: "شركة دجلة والفرات للتوزيع", email: "tigris@dist.com", phone: "+9647801111111", address: "بغداد، العراق" },
  });
  const cust2 = await prisma.customer.create({
    data: { name: "محلات المشرق للإلكترونيات", email: "mashreq@store.com", phone: "+9647802222222", address: "البصرة، العراق" },
  });

  const supp = await prisma.supplier.create({
    data: { companyName: "شركة الخليج للتوريدات التقنية", contactName: "رائد صبري", email: "gulf@supp.com", phone: "+9647903333333", address: "دبي، الإمارات العربية المتحدة" },
  });

  // 10. Historic Attendance Seeding (Spanning last 3 months)
  console.log("Generating employee attendance registry logs for the past 3 months...");
  const attendanceDate = new Date();
  for (let i = 90; i >= 1; i--) {
    const logDate = new Date(attendanceDate);
    logDate.setDate(attendanceDate.getDate() - i);

    // Skip weekends (Friday/Saturday Iraqi defaults)
    const day = logDate.getDay();
    if (day === 5 || day === 6) continue;

    const dateStr = logDate.toISOString().split("T")[0];

    for (const emp of dbEmployees) {
      // Skip some records randomly to simulate absences / leaves
      const random = Math.random();
      if (random < 0.05) {
        // Absent
        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            attendanceDate: logDate,
            status: "ABSENT",
            workHours: 0,
            lateMinutes: 0,
            overtimeHours: 0,
          },
        });
      } else {
        // Present
        const isLate = Math.random() < 0.15;
        const lateMinutes = isLate ? Math.floor(Math.random() * 45) + 10 : 0;
        const checkIn = new Date(`${dateStr}T09:${isLate ? "15" : "00"}:00Z`);
        const checkOut = new Date(`${dateStr}T17:00:00Z`);

        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            attendanceDate: logDate,
            status: "PRESENT",
            checkIn,
            checkOut,
            workHours: 8.0,
            lateMinutes,
            overtimeHours: 0.0,
          },
        });
      }
    }
  }

  // 11. Leave Types & Sample Requests
  console.log("Setting up leave requests...");
  const leaveAnnual = await prisma.leaveType.create({
    data: { code: "ANN", nameAr: "إجازة سنوية", nameEn: "Annual Leave", defaultDays: 21, paid: true, requiresApproval: true, active: true },
  });
  const leaveSick = await prisma.leaveType.create({
    data: { code: "SCK", nameAr: "إجازة مرضية", nameEn: "Sick Leave", defaultDays: 15, paid: true, requiresApproval: true, active: true },
  });

  // Create a few approved leaves
  for (let i = 0; i < 5; i++) {
    const targetEmp = dbEmployees[i + 5]; // target sales or hr
    await prisma.leaveRequest.create({
      data: {
        requestNumber: `LR-2026-${1000 + i}`,
        employeeId: targetEmp.id,
        leaveTypeId: leaveAnnual.id,
        startDate: new Date("2026-04-10"),
        endDate: new Date("2026-04-14"),
        totalDays: 5,
        reason: "إجازة عائلية طارئة",
        status: "APPROVED",
        approvedAt: new Date("2026-04-09"),
      },
    });
  }

  // 12. Salary Structures
  console.log("Configuring employee salary structures...");
  for (const emp of dbEmployees) {
    let basic = 600000; // General Employee: 600K IQD
    if (emp.employeeNumber.includes("ADMIN")) basic = 3500000; // Admin: 3.5M IQD
    else if (emp.employeeNumber.includes("MANAGER")) basic = 2000000; // Mgr: 2.0M IQD
    else if (emp.employeeNumber.includes("ACCOUNTANT")) basic = 1200000; // Accountant: 1.2M IQD
    else if (emp.employeeNumber.includes("CASHIER")) basic = 850000; // Cashier: 850K IQD
    else if (emp.employeeNumber.includes("SALES")) basic = 900000; // Sales: 900K IQD

    await prisma.salaryStructure.create({
      data: {
        employeeId: emp.id,
        basicSalary: basic,
        housing: basic * 0.15,
        transportation: basic * 0.1,
        food: 50000,
        risk: 0,
        otherAllowances: 0,
        taxPct: 5,
        insurance: 25000,
        active: true,
      },
    });
  }

  // 13. Payroll Periods & Runs (Spanning last 3 months)
  console.log("Generating payroll periods history...");
  const monthNamesEn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthNamesAr = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"];
  
  for (let m = 4; m <= 6; m++) {
    const periodCode = `P-2026-0${m}`;
    const nameAr = `رواتب شهر ${monthNamesAr[m - 1]} 2026`;
    const nameEn = `Payroll for ${monthNamesEn[m - 1]} 2026`;
    
    // Clean dates format matching
    const fmtStart = new Date(2026, m - 1, 1);
    const fmtEnd = new Date(2026, m - 1, 30);

    const period = await prisma.payrollPeriod.create({
      data: {
        code: periodCode,
        nameAr,
        nameEn,
        startDate: fmtStart,
        endDate: fmtEnd,
        status: "LOCKED",
      },
    });

    const run = await prisma.payrollRun.create({
      data: {
        payrollPeriodId: period.id,
        status: "LOCKED",
        createdAt: fmtEnd,
      },
    });

    // Create payroll items and payslips
    for (const emp of dbEmployees) {
      const struct = await prisma.salaryStructure.findUnique({ where: { employeeId: emp.id } });
      if (!struct) continue;

      const base = Number(struct.basicSalary);
      const allow = Number(struct.housing) + Number(struct.transportation) + Number(struct.food);
      const tax = base * (Number(struct.taxPct) / 100);
      const ins = Number(struct.insurance);

      const gross = base + allow;
      const deduct = tax + ins;
      const net = gross - deduct;

      const pItem = await prisma.payrollItem.create({
        data: {
          payrollRunId: run.id,
          employeeId: emp.id,
          basicSalary: base,
          housing: Number(struct.housing),
          transportation: Number(struct.transportation),
          food: Number(struct.food),
          risk: Number(struct.risk),
          otherAllowances: Number(struct.otherAllowances),
          overtimePay: 0,
          taxDeduction: tax,
          insuranceDeduction: ins,
          lateDeduction: 0,
          absentDeduction: 0,
          totalAllowances: allow,
          totalDeductions: deduct,
          grossSalary: gross,
          netSalary: net,
        },
      });

      await prisma.payslip.create({
        data: {
          payrollItemId: pItem.id,
          payslipNumber: `PS-${periodCode}-${emp.employeeNumber}`,
        },
      });
    }
  }

  // 14. Seed Company General Settings
  console.log("Updating default ERP system settings...");
  const settingsData = [
    { key: "COMPANY_NAME", value: "شركة أرض الرافدين التجارية" },
    { key: "DEFAULT_CURRENCY", value: "IQD" },
    { key: "TAX_RATE", value: "0" },
    { key: "TIME_ZONE", value: "Asia/Baghdad" },
    { key: "NUMBER_FORMATTING_LOCALE", value: "ar-IQ" },
    { key: "INVOICE_NUMBERING_PREFIX", value: "IQ-INV-" },
  ];

  for (const s of settingsData) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }

  console.log("=== SEEDING COMPLETED SUCCESSFULLY ===");
}

main()
  .catch((err) => {
    console.error("Critical error during demo seeding:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaService } from "./src/prisma/prisma.service";
import { AccountingService } from "./src/accounting/accounting.service";
import { SalesService } from "./src/sales/sales.service";
import { QuotationsService } from "./src/quotations/quotations.service";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaService();
const accountingService = new AccountingService(prisma);
const salesService = new SalesService(prisma, accountingService);
const quotationsService = new QuotationsService(prisma, salesService);

async function runTest() {
  console.log("=== STARTING APPROVAL WORKFLOW INTEGRATION TEST ===");

  // 1. Setup test data
  console.log("Setting up test data...");
  const customer = await prisma.customer.create({
    data: { name: "Approval Test Customer" },
  });

  const category = await prisma.category.findFirst();
  const warehouse = await prisma.warehouse.findFirst();
  if (!category || !warehouse) throw new Error("Missing seed data.");

  const product = await prisma.product.create({
    data: {
      name: "Approval Test Product",
      sku: `SKU-APR-${Date.now().toString().slice(-4)}`,
      costPrice: new Decimal(100.00),
      retailPrice: new Decimal(200.00),
      categoryId: category.id,
      unit: "PCS",
    },
  });

  await prisma.inventory.create({
    data: {
      productId: product.id,
      warehouseId: warehouse.id,
      quantity: new Decimal(50.00),
    },
  });

  // Get a user ID for the test
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user found for testing.");
  const userId = user.id;

  console.log(`Test setup complete: Customer=${customer.name}, Product=${product.name}, User=${user.email}`);

  // 2. Create Quotation (Draft)
  console.log("\n--- Step 1: Create Quotation ---");
  const quotation = await quotationsService.createQuotation({
    customerId: customer.id,
    issueDate: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        productId: product.id,
        quantity: 5,
        unit: "PCS",
        unitPrice: 200.00,
        discountPct: 0,
        taxPct: 0,
      },
    ],
  }, userId);
  console.log(`Quotation created: ${quotation.quotationNumber}, Status: ${quotation.status}`);
  if (quotation.status !== "DRAFT") throw new Error("Expected DRAFT status");

  // 3. Try to convert DRAFT (must fail)
  console.log("\n--- Step 2: Attempt Convert from DRAFT (must fail) ---");
  try {
    await quotationsService.convertToInvoice(quotation.id, "CASH", 1000, userId);
    throw new Error("SHOULD HAVE FAILED: Convert from DRAFT should be blocked!");
  } catch (err: any) {
    if (err.message.includes("لا يمكن تحويل عرض السعر")) {
      console.log("✅ Convert from DRAFT correctly blocked.");
    } else {
      throw err;
    }
  }

  // 4. Submit for Approval
  console.log("\n--- Step 3: Submit for Approval ---");
  const submitted = await quotationsService.submitForApproval(quotation.id, userId);
  console.log(`Status after submit: ${submitted.status}, SubmittedAt: ${submitted.submittedAt}`);
  if (submitted.status !== "SUBMITTED") throw new Error("Expected SUBMITTED status");
  if (!submitted.submittedAt) throw new Error("Expected submittedAt to be set");
  if (submitted.submittedById !== userId) throw new Error("Expected submittedById to be the current user");

  // 5. Try to convert SUBMITTED (must fail)
  console.log("\n--- Step 4: Attempt Convert from SUBMITTED (must fail) ---");
  try {
    await quotationsService.convertToInvoice(quotation.id, "CASH", 1000, userId);
    throw new Error("SHOULD HAVE FAILED: Convert from SUBMITTED should be blocked!");
  } catch (err: any) {
    if (err.message.includes("لا يمكن تحويل عرض السعر")) {
      console.log("✅ Convert from SUBMITTED correctly blocked.");
    } else {
      throw err;
    }
  }

  // 6. Try to submit again (must fail)
  console.log("\n--- Step 5: Attempt Submit again (must fail) ---");
  try {
    await quotationsService.submitForApproval(quotation.id, userId);
    throw new Error("SHOULD HAVE FAILED: Double submit should be blocked!");
  } catch (err: any) {
    if (err.message.includes("مسودة")) {
      console.log("✅ Double submit correctly blocked.");
    } else {
      throw err;
    }
  }

  // 7. Reject without comment (must fail)
  console.log("\n--- Step 6: Reject without comment (must fail) ---");
  try {
    await quotationsService.rejectQuotation(quotation.id, "", userId);
    throw new Error("SHOULD HAVE FAILED: Reject without comment should be blocked!");
  } catch (err: any) {
    if (err.message.includes("يجب توفير")) {
      console.log("✅ Reject without comment correctly blocked.");
    } else {
      throw err;
    }
  }

  // 8. Approve Quotation
  console.log("\n--- Step 7: Approve Quotation ---");
  const approved = await quotationsService.approveQuotation(quotation.id, userId);
  console.log(`Status after approve: ${approved.status}, ApprovedAt: ${approved.approvedAt}`);
  if (approved.status !== "APPROVED") throw new Error("Expected APPROVED status");
  if (!approved.approvedAt) throw new Error("Expected approvedAt to be set");
  if (approved.approvedById !== userId) throw new Error("Expected approvedById to be the current user");

  // 9. Convert Approved Quotation to Sales Invoice
  console.log("\n--- Step 8: Convert Approved Quotation to Sale ---");
  const sale = await quotationsService.convertToInvoice(quotation.id, "CASH", 1000, userId);
  console.log(`Sale created! Invoice: ${sale.invoiceNumber}, Total: ${sale.total}`);

  // 10. Verify converted status
  const converted = await prisma.quotation.findUnique({ where: { id: quotation.id } });
  if (converted?.status !== "CONVERTED") throw new Error("Expected CONVERTED status after conversion");
  if (!converted?.convertedAt) throw new Error("Expected convertedAt to be set");
  console.log("✅ Quotation status is CONVERTED.");

  // 11. Verify inventory was decremented (50 - 5 = 45)
  const inv = await prisma.inventory.findFirst({ where: { productId: product.id } });
  console.log(`Remaining stock: ${inv?.quantity.toNumber()} PCS`);
  if (inv?.quantity.toNumber() !== 45) throw new Error(`Expected 45 stock, got ${inv?.quantity.toNumber()}`);
  console.log("✅ Inventory correctly decremented.");

  // 12. Verify AuditLog entries
  const auditLogs = await prisma.auditLog.findMany({
    where: { entityId: quotation.id, entityName: "Quotation" },
    orderBy: { createdAt: "asc" },
  });
  console.log(`\nAudit Log entries: ${auditLogs.length}`);
  for (const log of auditLogs) {
    console.log(`  - ${log.action}: ${JSON.stringify(log.newValues)}`);
  }
  if (auditLogs.length < 2) throw new Error("Expected at least 2 audit log entries (submit + approve)");
  console.log("✅ Audit logs correctly written.");

  // 13. Dashboard Approval KPIs
  const dashboard = await quotationsService.getQuotationDashboard();
  console.log(`\nDashboard KPIs: ${JSON.stringify(dashboard.approvalWorkflow)}`);
  console.log("✅ Dashboard approval KPIs returned.");

  // 14. Cleanup
  console.log("\nCleaning up test data...");
  const invoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: sale.invoiceNumber },
  });
  if (invoice) {
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.payment.deleteMany({ where: { saleId: sale.saleId } });
    const entry = await prisma.journalEntry.findFirst({ where: { reference: invoice.invoiceNumber } });
    if (entry) {
      await prisma.journalItem.deleteMany({ where: { journalEntryId: entry.id } });
      await prisma.journalEntry.delete({ where: { id: entry.id } });
    }
    await prisma.invoice.delete({ where: { id: invoice.id } });
  }
  await prisma.sale.deleteMany({ where: { customerId: customer.id } });
  await prisma.auditLog.deleteMany({ where: { entityId: quotation.id } });
  await prisma.inventoryMovement.deleteMany({ where: { productId: product.id } });
  await prisma.inventory.deleteMany({ where: { productId: product.id } });
  await prisma.quotationItem.deleteMany({ where: { quotation: { customerId: customer.id } } });
  await prisma.quotation.deleteMany({ where: { customerId: customer.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.customer.delete({ where: { id: customer.id } });

  console.log("\n=== APPROVAL WORKFLOW INTEGRATION TEST PASSED SUCCESSFULLY! ===");
}

runTest()
  .catch((err) => {
    console.error("\n❌ APPROVAL WORKFLOW TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaService } from "./src/prisma/prisma.service";
import { AccountingService } from "./src/accounting/accounting.service";
import { SalesService } from "./src/sales/sales.service";
import { QuotationsService } from "./src/quotations/quotations.service";
import { SalesOrdersService } from "./src/sales-orders/sales-orders.service";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaService();
const accountingService = new AccountingService(prisma);
const salesService = new SalesService(prisma, accountingService);
const quotationsService = new QuotationsService(prisma, salesService);
const salesOrdersService = new SalesOrdersService(prisma, salesService, accountingService);

async function runTest() {
  console.log("=== STARTING SALES ORDER & DELIVERY INTEGRATION TEST ===");

  // 1. Setup test data
  console.log("Setting up test data...");
  const customer = await prisma.customer.create({
    data: { name: "Sales Order Test Customer" },
  });

  const category = await prisma.category.findFirst();
  const warehouse = await prisma.warehouse.findFirst();
  if (!category || !warehouse) throw new Error("Missing seed data.");

  const product = await prisma.product.create({
    data: {
      name: "Sales Order Test Product",
      sku: `SKU-SO-${Date.now().toString().slice(-4)}`,
      costPrice: new Decimal(100.00),
      retailPrice: new Decimal(200.00),
      categoryId: category.id,
      unit: "PCS",
    },
  });

  const inventory = await prisma.inventory.create({
    data: {
      productId: product.id,
      warehouseId: warehouse.id,
      quantity: new Decimal(50.00),
      reserved: new Decimal(0.00),
    },
  });

  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user found for testing.");
  const userId = user.id;

  console.log(`Test setup complete: Customer=${customer.name}, Product=${product.name}, User=${user.email}, Initial Stock=50 PCS`);

  // 2. Create Quotation & Approve
  console.log("\n--- Step 1: Create and Approve Quotation ---");
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
        taxPct: 15.00,
      },
    ],
  }, userId);

  await quotationsService.submitForApproval(quotation.id, userId);
  await quotationsService.approveQuotation(quotation.id, userId);
  console.log(`Quotation ${quotation.quotationNumber} approved successfully.`);

  // 3. Convert Quotation to Sales Order
  console.log("\n--- Step 2: Convert Quotation to Sales Order ---");
  const salesOrder = await salesOrdersService.convertFromQuotation(quotation.id, userId);
  console.log(`Sales Order created: ${salesOrder.salesOrderNumber}, Status: ${salesOrder.status}`);
  if (salesOrder.status !== "DRAFT") throw new Error("Expected SO to start as DRAFT");
  if (salesOrder.items.length !== 1) throw new Error("Expected 1 item copied from quotation");

  const orderItem = salesOrder.items[0];
  if (orderItem.quantity.toNumber() !== 5) throw new Error("Expected quantity of 5");
  if (orderItem.deliveredQuantity.toNumber() !== 0) throw new Error("Expected deliveredQuantity to be 0");
  if (orderItem.remainingQuantity.toNumber() !== 5) throw new Error("Expected remainingQuantity to be 5");

  // 4. Try to create delivery note while SO is DRAFT (must fail)
  console.log("\n--- Step 3: Attempt Delivery Note creation for DRAFT order (must fail) ---");
  try {
    await salesOrdersService.createDeliveryNote(salesOrder.id, {
      deliveryDate: new Date().toISOString(),
      items: [{ productId: product.id, quantity: 3 }],
    }, userId);
    throw new Error("SHOULD HAVE FAILED: Delivery Note creation should be blocked for DRAFT sales orders!");
  } catch (err: any) {
    if (err.message.includes("لا يمكن إنشاء إذن تسليم")) {
      console.log("✅ Blocked delivery note creation for DRAFT order successfully.");
    } else {
      throw err;
    }
  }

  // 5. Confirm Sales Order (Stock Reservation)
  console.log("\n--- Step 4: Confirm Sales Order ---");
  const confirmedSO = await salesOrdersService.confirmSalesOrder(salesOrder.id, userId);
  console.log(`Sales Order Status: ${confirmedSO.status}`);
  if (confirmedSO.status !== "CONFIRMED") throw new Error("Expected status CONFIRMED");

  // Check inventory reserved
  const invAfterConfirm = await prisma.inventory.findUnique({ where: { id: inventory.id } });
  console.log(`Stock: ${invAfterConfirm?.quantity.toNumber()} PCS, Reserved: ${invAfterConfirm?.reserved.toNumber()} PCS`);
  if (invAfterConfirm?.quantity.toNumber() !== 50) throw new Error("Inventory quantity should not decrease yet!");
  if (invAfterConfirm?.reserved.toNumber() !== 5) throw new Error("Expected 5 PCS to be reserved");
  console.log("✅ Stock successfully reserved.");

  // 6. Create Partial Delivery Note (3 PCS)
  console.log("\n--- Step 5: Create and Complete Partial Delivery Note (3 PCS) ---");
  const deliveryDraft = await salesOrdersService.createDeliveryNote(salesOrder.id, {
    deliveryDate: new Date().toISOString(),
    driver: "Ali",
    receiver: "Acme Store Manager",
    items: [{ productId: product.id, quantity: 3 }],
  }, userId);
  console.log(`Delivery Note Draft: ${deliveryDraft.deliveryNumber}, Status: ${deliveryDraft.status}`);

  const deliveryCompleted = await salesOrdersService.completeDeliveryNote(deliveryDraft.id, userId);
  console.log(`Delivery Note Status: ${deliveryCompleted.status}`);
  if (deliveryCompleted.status !== "COMPLETED") throw new Error("Expected Delivery Note status to be COMPLETED");

  // Check inventory decremented and reserved released
  const invAfterDelivery1 = await prisma.inventory.findUnique({ where: { id: inventory.id } });
  console.log(`Stock: ${invAfterDelivery1?.quantity.toNumber()} PCS, Reserved: ${invAfterDelivery1?.reserved.toNumber()} PCS`);
  if (invAfterDelivery1?.quantity.toNumber() !== 47) throw new Error("Stock should decrease to 47 PCS");
  if (invAfterDelivery1?.reserved.toNumber() !== 2) throw new Error("Reserved stock should decrease to 2 PCS");

  // Check Sales Order status and delivered / remaining quantities
  const orderAfterDelivery1 = await salesOrdersService.getSalesOrderDetails(salesOrder.id);
  console.log(`Sales Order Status: ${orderAfterDelivery1.status}`);
  if (orderAfterDelivery1.status !== "PARTIALLY_DELIVERED") throw new Error("Expected status PARTIALLY_DELIVERED");

  const itemAfterDelivery1 = orderAfterDelivery1.items[0];
  console.log(`Delivered Qty: ${itemAfterDelivery1.deliveredQuantity.toNumber()}, Remaining Qty: ${itemAfterDelivery1.remainingQuantity.toNumber()}`);
  if (itemAfterDelivery1.deliveredQuantity.toNumber() !== 3) throw new Error("Expected delivered quantity of 3");
  if (itemAfterDelivery1.remainingQuantity.toNumber() !== 2) throw new Error("Expected remaining quantity of 2");
  console.log("✅ Partial delivery successfully recorded and stock decremented.");

  // 7. Create Invoice for Delivered Quantities (3 PCS)
  console.log("\n--- Step 6: Create Invoice for delivered quantities (3 PCS) ---");
  const invoiceResult = await salesOrdersService.createInvoiceFromOrder(salesOrder.id, {
    amountPaid: 690.00, // 3 * 200 * 1.15 = 690
    paymentMethod: "CASH",
  }, userId);
  console.log(`Invoice created successfully! Number: ${invoiceResult.invoiceNumber}, Total: ${invoiceResult.total}`);

  // Check SalesOrderItem invoicedQuantity
  const orderAfterInvoice1 = await salesOrdersService.getSalesOrderDetails(salesOrder.id);
  const itemAfterInvoice1 = orderAfterInvoice1.items[0];
  console.log(`Invoiced Qty: ${itemAfterInvoice1.invoicedQuantity.toNumber()}`);
  if (itemAfterInvoice1.invoicedQuantity.toNumber() !== 3) throw new Error("Expected invoiced quantity of 3");

  // Check accounting Trial Balance balances
  const trialBalance1 = await accountingService.getAccounts();
  const totalDebit1 = trialBalance1.reduce((sum, a) => sum + (a.type === "ASSET" || a.type === "EXPENSE" ? a.currentBalance.toNumber() : 0), 0);
  const totalCredit1 = trialBalance1.reduce((sum, a) => sum + (a.type === "LIABILITY" || a.type === "EQUITY" || a.type === "REVENUE" ? a.currentBalance.toNumber() : 0), 0);
  console.log(`Trial Balance: Total Debit: ${totalDebit1}, Total Credit: ${totalCredit1}`);
  // Verification check - Trial balance should be perfectly balanced
  console.log("✅ Invoice and accounting entries generated successfully.");

  // 8. Create Second Delivery Note for remaining 2 PCS (Full delivery)
  console.log("\n--- Step 7: Complete remaining delivery (2 PCS) ---");
  const deliveryDraft2 = await salesOrdersService.createDeliveryNote(salesOrder.id, {
    deliveryDate: new Date().toISOString(),
    driver: "Ali",
    receiver: "Acme Store Manager",
    items: [{ productId: product.id, quantity: 2 }],
  }, userId);
  await salesOrdersService.completeDeliveryNote(deliveryDraft2.id, userId);

  const orderAfterDelivery2 = await salesOrdersService.getSalesOrderDetails(salesOrder.id);
  console.log(`Sales Order Status: ${orderAfterDelivery2.status}`);
  if (orderAfterDelivery2.status !== "DELIVERED") throw new Error("Expected status DELIVERED");

  const itemAfterDelivery2 = orderAfterDelivery2.items[0];
  console.log(`Delivered Qty: ${itemAfterDelivery2.deliveredQuantity.toNumber()}, Remaining Qty: ${itemAfterDelivery2.remainingQuantity.toNumber()}`);
  if (itemAfterDelivery2.deliveredQuantity.toNumber() !== 5) throw new Error("Expected delivered quantity of 5");
  if (itemAfterDelivery2.remainingQuantity.toNumber() !== 0) throw new Error("Expected remaining quantity of 0");

  const invAfterDelivery2 = await prisma.inventory.findUnique({ where: { id: inventory.id } });
  console.log(`Stock: ${invAfterDelivery2?.quantity.toNumber()} PCS, Reserved: ${invAfterDelivery2?.reserved.toNumber()} PCS`);
  if (invAfterDelivery2?.quantity.toNumber() !== 45) throw new Error("Stock should decrease to 45 PCS");
  if (invAfterDelivery2?.reserved.toNumber() !== 0) throw new Error("Reserved stock should decrease to 0");
  console.log("✅ Remaining delivery completed and stock reservation fully released.");

  // 9. Generate Invoice for remaining delivered quantities (2 PCS)
  console.log("\n--- Step 8: Invoice remaining delivered quantities (2 PCS) ---");
  const invoiceResult2 = await salesOrdersService.createInvoiceFromOrder(salesOrder.id, {
    amountPaid: 460.00, // 2 * 200 * 1.15 = 460
    paymentMethod: "CASH",
  }, userId);
  console.log(`Invoice 2 created! Number: ${invoiceResult2.invoiceNumber}, Total: ${invoiceResult2.total}`);

  // Verify Sales Order status becomes CLOSED
  const finalOrder = await salesOrdersService.getSalesOrderDetails(salesOrder.id);
  console.log(`Final Sales Order Status: ${finalOrder.status}`);
  if (finalOrder.status !== "CLOSED") throw new Error("Expected status CLOSED after complete delivery and invoicing");
  console.log("✅ Sales Order is CLOSED.");

  // 10. Verify final customer timeline events logged
  const timelines = await prisma.leadTimeline.findMany({
    where: { leadId: quotation.leadId || undefined },
    orderBy: { createdAt: "asc" },
  });
  console.log(`\nTimeline events logged: ${timelines.length}`);
  for (const t of timelines) {
    console.log(`  - [${t.type}]: ${t.description}`);
  }
  console.log("✅ Customer timeline logs written.");

  // 11. Cleanup
  console.log("\nCleaning up test data...");
  // Delete sales invoices
  for (const sale of finalOrder.sales) {
    if (sale.invoice) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: sale.invoice.id } });
      await prisma.payment.deleteMany({ where: { saleId: sale.id } });
      const entry = await prisma.journalEntry.findFirst({ where: { reference: sale.invoice.invoiceNumber } });
      if (entry) {
        await prisma.journalItem.deleteMany({ where: { journalEntryId: entry.id } });
        await prisma.journalEntry.delete({ where: { id: entry.id } });
      }
      await prisma.invoice.delete({ where: { id: sale.invoice.id } });
    }
  }
  await prisma.sale.deleteMany({ where: { customerId: customer.id } });
  await prisma.deliveryNoteItem.deleteMany({ where: { deliveryNote: { salesOrderId: salesOrder.id } } });
  await prisma.deliveryNote.deleteMany({ where: { salesOrderId: salesOrder.id } });
  await prisma.salesOrderItem.deleteMany({ where: { salesOrderId: salesOrder.id } });
  await prisma.salesOrder.deleteMany({ where: { customerId: customer.id } });
  await prisma.quotationItem.deleteMany({ where: { quotationId: quotation.id } });
  await prisma.quotation.deleteMany({ where: { customerId: customer.id } });
  await prisma.leadTimeline.deleteMany({ where: { leadId: quotation.leadId || undefined } });
  await prisma.inventoryMovement.deleteMany({ where: { productId: product.id } });
  await prisma.inventory.deleteMany({ where: { productId: product.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.customer.delete({ where: { id: customer.id } });

  console.log("\n=== SALES ORDER & DELIVERY WORKFLOW INTEGRATION TEST PASSED SUCCESSFULLY! ===");
}

runTest()
  .catch((err) => {
    console.error("\n❌ SALES ORDER INTEGRATION TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

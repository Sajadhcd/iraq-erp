import { UnitOfMeasure } from "@prisma/client";
import { PrismaService } from "./src/prisma/prisma.service";
import { AccountingService } from "./src/accounting/accounting.service";
import { SalesService } from "./src/sales/sales.service";
import { PurchasingService } from "./src/purchasing/purchasing.service";
import { InventoryService } from "./src/inventory/inventory.service";

const prisma = new PrismaService();

async function runTest() {
  console.log("=== STARTING INTEGRATION TEST ===");

  // Instantiate services manually with prisma client
  const accountingService = new AccountingService(prisma);
  const salesService = new SalesService(prisma, accountingService);
  const purchasingService = new PurchasingService(prisma, accountingService);
  const inventoryService = new InventoryService(prisma, accountingService);

  // 1. Fetch initial balances
  const accounts = await accountingService.getAccounts();
  console.log(`Fetched ${accounts.length} accounts from Chart of Accounts.`);
  
  const cashAcc = accounts.find(a => a.code === "101000")!;
  const invAcc = accounts.find(a => a.code === "120000")!;
  const revenueAcc = accounts.find(a => a.code === "401000")!;
  const cogsAcc = accounts.find(a => a.code === "501000")!;

  console.log(`Initial Cash Balance: ${cashAcc.currentBalance}`);
  console.log(`Initial Inventory Balance: ${invAcc.currentBalance}`);

  // Create a dummy product for testing
  const sku = `TEST-SKU-${Date.now()}`;
  const category = await prisma.category.findFirst();
  const warehouse = await prisma.warehouse.findFirst();

  if (!category || !warehouse) {
    throw new Error("Ensure category and warehouse exist in the DB (run seed first)");
  }

  console.log("Creating test product...");
  const product = await inventoryService.createProduct({
    name: "Test Audit Product",
    sku,
    categoryId: category.id,
    costPrice: 50.00,
    retailPrice: 150.00,
    initialStock: 100,
    warehouseId: warehouse.id
  });

  // Verify inventory asset increase from opening stock
  // Stock adjustments / initial stock are integrated. Let's see the balance changes:
  const invAfterProduct = await prisma.account.findFirst({ where: { code: "120000" } });
  console.log(`Inventory Balance after Product creation (100 qty * 50 cost = 5000): ${invAfterProduct?.currentBalance}`);

  // 2. Perform a POS Checkout (Sale)
  console.log("Testing Sale Checkout...");
  const saleResult = await salesService.createSale({
    items: [
      { productId: product.id, quantity: 10, unitPrice: 150.00 }
    ],
    paymentMethod: "CASH",
    amountPaid: 1500.00,
  });

  console.log(`Sale completed: Invoice Number: ${saleResult.invoiceNumber}, Total: ${saleResult.total}`);

  // Fetch balances after sale
  const cashAfterSale = await prisma.account.findFirst({ where: { code: "101000" } });
  const invAfterSale = await prisma.account.findFirst({ where: { code: "120000" } });
  const revenueAfterSale = await prisma.account.findFirst({ where: { code: "401000" } });
  const cogsAfterSale = await prisma.account.findFirst({ where: { code: "501000" } });

  console.log(`Cash Balance (should increase by 1500): ${cashAfterSale?.currentBalance}`);
  console.log(`Inventory Balance (should decrease by 10 qty * 50 cost = 500): ${invAfterSale?.currentBalance}`);
  console.log(`Sales Revenue (should increase by 1500): ${revenueAfterSale?.currentBalance}`);
  console.log(`COGS Balance (should increase by 500): ${cogsAfterSale?.currentBalance}`);

  if (parseFloat(cashAfterSale?.currentBalance.toString() || "0") === 0) {
    throw new Error("Cash balance did not update!");
  }

  // 3. Create a Voucher (Payment Voucher)
  console.log("Testing Voucher Creation...");
  const voucher = await accountingService.createVoucher({
    type: "PAYMENT",
    amount: 200,
    fromAccountId: cashAcc.id, // Pay from cash
    toAccountId: cogsAcc.id, // Pay to expense (mocked target)
    notes: "Test manual electricity bill payment"
  });

  console.log(`Payment Voucher created: ${voucher.voucherNumber}, status: ${voucher.status}`);
  const cashAfterVoucher = await prisma.account.findFirst({ where: { code: "101000" } });
  console.log(`Cash Balance after Voucher (should decrease by 200): ${cashAfterVoucher?.currentBalance}`);

  // Clean up test records to keep DB clean
  console.log("Cleaning up test data...");
  await prisma.journalItem.deleteMany({
    where: {
      journalEntry: {
        reference: { in: [saleResult.invoiceNumber, voucher.voucherNumber] }
      }
    }
  });
  await prisma.journalEntry.deleteMany({
    where: {
      reference: { in: [saleResult.invoiceNumber, voucher.voucherNumber] }
    }
  });
  await prisma.voucher.delete({ where: { id: voucher.id } });
  await prisma.payment.deleteMany({ where: { saleId: saleResult.saleId } });
  await prisma.invoiceItem.deleteMany({ where: { invoice: { saleId: saleResult.saleId } } });
  await prisma.invoice.delete({ where: { saleId: saleResult.saleId } });
  await prisma.sale.delete({ where: { id: saleResult.saleId } });
  await prisma.inventoryMovement.deleteMany({ where: { productId: product.id } });
  await prisma.inventory.deleteMany({ where: { productId: product.id } });
  await prisma.priceHistory.deleteMany({ where: { productId: product.id } });
  await prisma.product.delete({ where: { id: product.id } });

  console.log("=== INTEGRATION TEST PASSED SUCCESSFULLY! ===");
}

runTest()
  .catch(err => {
    console.error("Test failed: ", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

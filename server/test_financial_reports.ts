import { PrismaService } from "./src/prisma/prisma.service";
import { ReportsService } from "./src/reports/reports.service";

const prisma = new PrismaService();

async function runTest() {
  console.log("=== STARTING FINANCIAL REPORTS INTEGRATION TEST ===");

  const reportsService = new ReportsService(prisma);

  // 1. Test Trial Balance
  console.log("Testing Trial Balance...");
  const trialBalance = await reportsService.getTrialBalance();
  console.log(`Trial Balance: Fetch successful. Total Debit: ${trialBalance.totalDebit}, Total Credit: ${trialBalance.totalCredit}`);
  
  if (Math.abs(trialBalance.totalDebit - trialBalance.totalCredit) > 0.01) {
    throw new Error(`Trial Balance is not balanced! Difference: ${Math.abs(trialBalance.totalDebit - trialBalance.totalCredit)}`);
  }
  console.log("-> Trial Balance is perfectly balanced! OK.");

  // 2. Test Profit & Loss
  console.log("Testing Profit & Loss...");
  const pl = await reportsService.getProfitLoss();
  console.log(`Profit & Loss: Revenue: ${pl.revenue}, COGS: ${pl.cogs}, Expenses: ${pl.totalExpenses}, Net Profit: ${pl.netProfit}`);
  console.log("-> Profit & Loss generated successfully! OK.");

  // 3. Test Balance Sheet
  console.log("Testing Balance Sheet...");
  const bs = await reportsService.getBalanceSheet();
  console.log(`Balance Sheet: Total Assets: ${bs.totalAssets}, Total Liabilities: ${bs.totalLiabilities}, Total Equity: ${bs.totalEquity}, Liabilities + Equity: ${bs.totalLiabilitiesAndEquity}`);
  
  const difference = Math.abs(bs.totalAssets - bs.totalLiabilitiesAndEquity);
  if (difference > 0.01) {
    throw new Error(`Balance Sheet is not balanced! Assets = ${bs.totalAssets}, Liabilities + Equity = ${bs.totalLiabilitiesAndEquity}. Difference: ${difference}`);
  }
  console.log("-> Balance Sheet is perfectly balanced (Assets = Liabilities + Equity)! OK.");

  // 4. Test Customer Statement
  console.log("Testing Customer Statement...");
  const customer = await prisma.customer.findFirst();
  if (customer) {
    const custStatement = await reportsService.getCustomerStatement(customer.id);
    console.log(`Customer Statement for ${customer.name}: Opening Balance: ${custStatement.openingBalance}, Transactions count: ${custStatement.transactions.length}, Closing Balance: ${custStatement.closingBalance}`);
  } else {
    console.log("No customer in DB to test customer statement.");
  }

  // 5. Test Supplier Statement
  console.log("Testing Supplier Statement...");
  const supplier = await prisma.supplier.findFirst();
  if (supplier) {
    const suppStatement = await reportsService.getSupplierStatement(supplier.id);
    console.log(`Supplier Statement for ${supplier.companyName}: Opening Balance: ${suppStatement.openingBalance}, Transactions count: ${suppStatement.transactions.length}, Closing Balance: ${suppStatement.closingBalance}`);
  } else {
    console.log("No supplier in DB to test supplier statement.");
  }

  // 6. Test Cash/Bank Ledgers
  console.log("Testing Cash Ledger...");
  const cashAcc = await prisma.account.findFirst({ where: { code: "101000" } });
  if (cashAcc) {
    const ledger = await reportsService.getAccountLedger(cashAcc.id);
    console.log(`Ledger for ${cashAcc.nameEn} (${cashAcc.code}): Opening: ${ledger.openingBalance}, Transactions count: ${ledger.transactions.length}, Closing: ${ledger.closingBalance}`);
  } else {
    console.log("Cash asset account 101000 not found in Chart of Accounts.");
  }

  console.log("=== FINANCIAL REPORTS INTEGRATION TEST PASSED SUCCESSFULLY! ===");
}

runTest()
  .catch(err => {
    console.error("Financial Reports Test failed: ", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

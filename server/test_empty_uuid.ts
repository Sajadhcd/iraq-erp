import { PrismaService } from "./src/prisma/prisma.service";
import { AccountingService } from "./src/accounting/accounting.service";
import { SalesService } from "./src/sales/sales.service";
import { QuotationsService } from "./src/quotations/quotations.service";

const prisma = new PrismaService();
const accountingService = new AccountingService(prisma);
const salesService = new SalesService(prisma, accountingService);
const quotationsService = new QuotationsService(prisma, salesService);

async function runTest() {
  console.log("=== STARTING EMPTY UUID VALIDATION TEST ===");

  const customer = await prisma.customer.create({
    data: {
      name: "Acme UUID Test Customer",
    },
  });

  const category = await prisma.category.findFirst();
  const product = await prisma.product.create({
    data: {
      name: "ERP License Token",
      sku: `SKU-UUID-${Date.now().toString().slice(-4)}`,
      costPrice: 50.00,
      retailPrice: 80.00,
      categoryId: category!.id,
    },
  });

  console.log("Creating Quotation passing empty string UUID parameters...");
  const quotation = await quotationsService.createQuotation({
    customerId: customer.id,
    leadId: "", // Empty string sent by select dropdown
    opportunityId: "", // Empty string
    salespersonId: "", // Empty string
    issueDate: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      {
        productId: product.id,
        quantity: 1,
        unit: "PCS",
        unitPrice: 80.00,
      },
    ],
  });

  console.log(`Quotation created successfully! Number: ${quotation.quotationNumber}, Status: ${quotation.status}`);
  if (quotation.leadId !== null || quotation.opportunityId !== null || quotation.salespersonId === "") {
    throw new Error("UUID fields were not sanitized to null/salesperson default!");
  }

  console.log("Cleaning up...");
  await prisma.quotationItem.deleteMany({ where: { quotationId: quotation.id } });
  await prisma.quotation.delete({ where: { id: quotation.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.customer.delete({ where: { id: customer.id } });

  console.log("=== EMPTY UUID VALIDATION TEST PASSED SUCCESSFULLY! ===");
}

runTest()
  .catch(err => {
    console.error("Test failed: ", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

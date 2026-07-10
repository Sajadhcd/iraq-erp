-- AlterTable
ALTER TABLE "sales_order_items" ADD COLUMN     "invoiced_quantity" DECIMAL(15,3) NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "reserved" DECIMAL(15,3) NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "sales_order_id" UUID;

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sales_order_number" VARCHAR(100) NOT NULL,
    "customer_id" UUID NOT NULL,
    "quotation_id" UUID,
    "salesperson_id" UUID,
    "warehouse_id" UUID NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'IQD',
    "exchange_rate" DECIMAL(15,4) NOT NULL DEFAULT 1.0,
    "order_date" TIMESTAMPTZ NOT NULL,
    "expected_delivery_date" TIMESTAMPTZ NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "internal_notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sales_order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(15,3) NOT NULL,
    "delivered_quantity" DECIMAL(15,3) NOT NULL DEFAULT 0.0,
    "remaining_quantity" DECIMAL(15,3) NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "unit_price" DECIMAL(15,4) NOT NULL,
    "discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "tax_pct" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "subtotal" DECIMAL(15,4) NOT NULL,
    "total" DECIMAL(15,4) NOT NULL,

    CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delivery_number" VARCHAR(100) NOT NULL,
    "sales_order_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "delivery_date" TIMESTAMPTZ NOT NULL,
    "driver" VARCHAR(255),
    "receiver" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "delivery_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_note_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "delivery_note_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(15,3) NOT NULL,
    "unit" VARCHAR(50) NOT NULL,

    CONSTRAINT "delivery_note_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_sales_order_number_key" ON "sales_orders"("sales_order_number");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_notes_delivery_number_key" ON "delivery_notes"("delivery_number");

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "crm_quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_salesperson_id_fkey" FOREIGN KEY ("salesperson_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_notes" ADD CONSTRAINT "delivery_notes_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_notes" ADD CONSTRAINT "delivery_notes_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_note_items" ADD CONSTRAINT "delivery_note_items_delivery_note_id_fkey" FOREIGN KEY ("delivery_note_id") REFERENCES "delivery_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_note_items" ADD CONSTRAINT "delivery_note_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "crm_quotations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quotation_number" VARCHAR(100) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "customer_id" UUID NOT NULL,
    "lead_id" UUID,
    "opportunity_id" UUID,
    "salesperson_id" UUID,
    "status" VARCHAR(50) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'IQD',
    "exchange_rate" DECIMAL(15,4) NOT NULL DEFAULT 1.0,
    "issue_date" TIMESTAMPTZ NOT NULL,
    "expiry_date" TIMESTAMPTZ NOT NULL,
    "payment_terms" TEXT,
    "delivery_terms" TEXT,
    "notes" TEXT,
    "internal_notes" TEXT,
    "sent_at" TIMESTAMPTZ,
    "viewed_at" TIMESTAMPTZ,
    "accepted_at" TIMESTAMPTZ,
    "rejected_at" TIMESTAMPTZ,
    "converted_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_quotation_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quotation_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(15,4) NOT NULL,
    "unit" "unit_of_measure" NOT NULL,
    "unit_price" DECIMAL(15,4) NOT NULL,
    "discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(15,4) NOT NULL,
    "total" DECIMAL(15,4) NOT NULL,

    CONSTRAINT "crm_quotation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_quotations_quotation_number_idx" ON "crm_quotations"("quotation_number");

-- CreateIndex
CREATE INDEX "crm_quotations_customer_id_idx" ON "crm_quotations"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "crm_quotations_quotation_number_version_key" ON "crm_quotations"("quotation_number", "version");

-- AddForeignKey
ALTER TABLE "crm_quotations" ADD CONSTRAINT "crm_quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_quotations" ADD CONSTRAINT "crm_quotations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_quotations" ADD CONSTRAINT "crm_quotations_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "crm_opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_quotations" ADD CONSTRAINT "crm_quotations_salesperson_id_fkey" FOREIGN KEY ("salesperson_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_quotation_items" ADD CONSTRAINT "crm_quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "crm_quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_quotation_items" ADD CONSTRAINT "crm_quotation_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "crm_quotations" ADD COLUMN     "approved_at" TIMESTAMPTZ,
ADD COLUMN     "approved_by_id" UUID,
ADD COLUMN     "rejected_by_id" UUID,
ADD COLUMN     "rejection_comment" TEXT,
ADD COLUMN     "submitted_at" TIMESTAMPTZ,
ADD COLUMN     "submitted_by_id" UUID;

-- AddForeignKey
ALTER TABLE "crm_quotations" ADD CONSTRAINT "crm_quotations_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_quotations" ADD CONSTRAINT "crm_quotations_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_quotations" ADD CONSTRAINT "crm_quotations_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

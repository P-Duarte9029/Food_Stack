-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "checkId" TEXT;

-- CreateTable
CREATE TABLE "guest_checks" (
    "id" TEXT NOT NULL,
    "tableSessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "guest_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guest_checks_tableSessionId_closedAt_idx" ON "guest_checks"("tableSessionId", "closedAt");

-- CreateIndex
CREATE INDEX "orders_checkId_idx" ON "orders"("checkId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "guest_checks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_checks" ADD CONSTRAINT "guest_checks_tableSessionId_fkey" FOREIGN KEY ("tableSessionId") REFERENCES "table_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

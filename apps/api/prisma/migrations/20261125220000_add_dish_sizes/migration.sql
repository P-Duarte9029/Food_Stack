-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "sizes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "size" TEXT;

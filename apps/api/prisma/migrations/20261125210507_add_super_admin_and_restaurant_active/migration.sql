-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'super_admin';

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

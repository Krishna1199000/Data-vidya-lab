/*
  Warnings:

  - You are about to drop the column `endTime` on the `LabSession` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `LabSession` table. All the data in the column will be lost.
  - The `status` column on the `LabSession` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `AwsAccount` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `password` to the `LabSession` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LabSessionStatus" AS ENUM ('ACTIVE', 'ENDED');

-- DropForeignKey
ALTER TABLE "LabSession" DROP CONSTRAINT "LabSession_awsAccountId_fkey";

-- DropIndex
DROP INDEX "LabSession_awsAccountId_idx";

-- AlterTable
ALTER TABLE "LabSession" DROP COLUMN "endTime",
DROP COLUMN "startTime",
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
DROP COLUMN "status",
ADD COLUMN     "status" "LabSessionStatus" NOT NULL DEFAULT 'ACTIVE';

-- DropTable
DROP TABLE "AwsAccount";

-- DropEnum
DROP TYPE "SessionStatus";

-- CreateIndex
CREATE INDEX "LabSession_status_idx" ON "LabSession"("status");

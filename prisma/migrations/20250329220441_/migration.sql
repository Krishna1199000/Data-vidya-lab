-- AlterTable
ALTER TABLE "LabSession" ADD COLUMN     "aws_access_key_id" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "aws_secret_access_key" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "aws_session_token" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

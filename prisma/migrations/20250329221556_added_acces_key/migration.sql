-- AlterTable
ALTER TABLE "LabSession" ALTER COLUMN "aws_access_key_id" DROP NOT NULL,
ALTER COLUMN "aws_access_key_id" DROP DEFAULT,
ALTER COLUMN "aws_secret_access_key" DROP NOT NULL,
ALTER COLUMN "aws_secret_access_key" DROP DEFAULT,
ALTER COLUMN "aws_session_token" DROP NOT NULL,
ALTER COLUMN "aws_session_token" DROP DEFAULT;

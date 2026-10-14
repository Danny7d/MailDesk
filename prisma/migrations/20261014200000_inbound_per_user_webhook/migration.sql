-- AlterTable
ALTER TABLE "ConnectedProvider" ADD COLUMN IF NOT EXISTS "webhookId" TEXT;
ALTER TABLE "ConnectedProvider" ADD COLUMN IF NOT EXISTS "encryptedWebhookSecret" TEXT;
ALTER TABLE "ConnectedProvider" ADD COLUMN IF NOT EXISTS "inboundEnabled" BOOLEAN NOT NULL DEFAULT false;

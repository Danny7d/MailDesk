ALTER TABLE "ConnectedProvider"
ADD COLUMN "domain" TEXT NOT NULL DEFAULT '*';

CREATE INDEX "ConnectedProvider_userId_provider_domain_idx"
ON "ConnectedProvider"("userId", "provider", "domain");

-- CreateTable
CREATE TABLE "EmailAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomingEmail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "messageId" TEXT,
    "from" TEXT NOT NULL,
    "subject" TEXT,
    "to" TEXT[],
    "cc" TEXT[],
    "bcc" TEXT[],
    "textBody" TEXT,
    "htmlBody" TEXT,
    "headers" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "provider" TEXT NOT NULL DEFAULT 'resend',
    "providerEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomingEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailAddress_email_key" ON "EmailAddress"("email");

-- CreateIndex
CREATE INDEX "EmailAddress_userId_idx" ON "EmailAddress"("userId");

-- CreateIndex
CREATE INDEX "EmailAddress_email_idx" ON "EmailAddress"("email");

-- CreateIndex
CREATE UNIQUE INDEX "IncomingEmail_emailId_key" ON "IncomingEmail"("emailId");

-- CreateIndex
CREATE INDEX "IncomingEmail_userId_idx" ON "IncomingEmail"("userId");

-- CreateIndex
CREATE INDEX "IncomingEmail_emailId_idx" ON "IncomingEmail"("emailId");

-- CreateIndex
CREATE INDEX "IncomingEmail_receivedAt_idx" ON "IncomingEmail"("receivedAt");

-- CreateIndex
CREATE INDEX "IncomingEmail_readAt_idx" ON "IncomingEmail"("readAt");

-- AddForeignKey
ALTER TABLE "EmailAddress" ADD CONSTRAINT "EmailAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingEmail" ADD CONSTRAINT "IncomingEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

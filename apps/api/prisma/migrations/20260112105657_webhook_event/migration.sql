/*
  Warnings:

  - You are about to drop the `webhook_events` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "webhook_events";

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "wompiTxId" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "errorMessage" TEXT,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookEvent_wompiTxId_idx" ON "WebhookEvent"("wompiTxId");

-- CreateIndex
CREATE INDEX "WebhookEvent_eventType_idx" ON "WebhookEvent"("eventType");

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "transaction_id" TEXT,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "error_message" TEXT,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_events_transaction_id_idx" ON "webhook_events"("transaction_id");

-- CreateIndex
CREATE INDEX "webhook_events_event_type_idx" ON "webhook_events"("event_type");

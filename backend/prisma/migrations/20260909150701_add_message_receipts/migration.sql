-- CreateEnum
CREATE TYPE "MessageStatusType" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- CreateTable
CREATE TABLE "message_receipts" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "MessageStatusType" NOT NULL DEFAULT 'SENT',
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_receipts_messageId_userId_key" ON "message_receipts"("messageId", "userId");

-- AddForeignKey
ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_receipts" ADD CONSTRAINT "message_receipts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

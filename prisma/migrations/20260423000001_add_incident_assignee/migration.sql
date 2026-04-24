-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'ASSIGNED';

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN "assigneeId" TEXT;

-- CreateIndex
CREATE INDEX "Incident_assigneeId_idx" ON "Incident"("assigneeId");

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "isPersonal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE INDEX "Group_createdBy_isPersonal_idx" ON "Group"("createdBy", "isPersonal");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

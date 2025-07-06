/*
  Warnings:

  - A unique constraint covering the columns `[telegramId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "stadionId" INTEGER,
ADD COLUMN     "telegramId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_stadionId_fkey" FOREIGN KEY ("stadionId") REFERENCES "Stadion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

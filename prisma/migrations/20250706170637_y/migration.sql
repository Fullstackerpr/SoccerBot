/*
  Warnings:

  - You are about to drop the column `stadion_id` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Booking` table. All the data in the column will be lost.
  - Added the required column `book_date` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stadionId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_stadion_id_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_user_id_fkey";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "stadion_id",
DROP COLUMN "user_id",
ADD COLUMN     "book_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "stadionId" INTEGER NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_stadionId_fkey" FOREIGN KEY ("stadionId") REFERENCES "Stadion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `Meneger_chat_id` on the `Stadion` table. All the data in the column will be lost.
  - You are about to drop the column `img` on the `Stadion` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Stadion` table. All the data in the column will be lost.
  - Added the required column `image` to the `Stadion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `latitude` to the `Stadion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `longitude` to the `Stadion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `menijer_chat_id` to the `Stadion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Stadion" DROP COLUMN "Meneger_chat_id",
DROP COLUMN "img",
DROP COLUMN "location",
ADD COLUMN     "image" TEXT NOT NULL,
ADD COLUMN     "latitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "longitude" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "menijer_chat_id" TEXT NOT NULL;

/*
  Warnings:

  - Added the required column `type` to the `messages` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "type" "MessageType" NOT NULL;

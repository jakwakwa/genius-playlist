/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "email_verified" TIMESTAMP(3),
ADD COLUMN     "image" TEXT,
ADD COLUMN     "name" TEXT,
ALTER COLUMN "spotify_id" DROP NOT NULL,
ALTER COLUMN "display_name" SET DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

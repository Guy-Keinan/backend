/*
  Warnings:

  - You are about to drop the column `content` on the `story_templates` table. All the data in the column will be lost.
  - Added the required column `female_version` to the `story_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `male_version` to the `story_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `placeholders` to the `story_templates` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "story_templates" DROP COLUMN "content",
ADD COLUMN     "female_version" TEXT NOT NULL,
ADD COLUMN     "male_version" TEXT NOT NULL,
ADD COLUMN     "placeholders" JSONB NOT NULL;

/*
  Warnings:

  - You are about to drop the `FoodTrackerSettings` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FoodTrackerSettings" DROP CONSTRAINT "FoodTrackerSettings_settingsId_fkey";

-- DropTable
DROP TABLE "FoodTrackerSettings";

-- CreateTable
CREATE TABLE "NutritionSettings" (
    "id" TEXT NOT NULL,
    "calorieTarget" DOUBLE PRECISION,
    "settingsId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NutritionSettings_settingsId_key" ON "NutritionSettings"("settingsId");

-- AddForeignKey
ALTER TABLE "NutritionSettings" ADD CONSTRAINT "NutritionSettings_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "UserSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

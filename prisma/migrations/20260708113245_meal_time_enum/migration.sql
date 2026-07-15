-- CreateEnum
CREATE TYPE "MealTimes" AS ENUM ('breakfast', 'morningSnack', 'lunch', 'eveningSnack', 'dinner');

-- AlterTable
ALTER TABLE "FoodTracker" ADD COLUMN     "mealTime" "MealTimes";

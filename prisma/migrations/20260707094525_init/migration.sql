-- CreateTable
CREATE TABLE "FoodTrackerSettings" (
    "id" TEXT NOT NULL,
    "calorieTarget" DOUBLE PRECISION,
    "settingsId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodTrackerSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSettings" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FoodTrackerSettings_settingsId_key" ON "FoodTrackerSettings"("settingsId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSettings_settingsId_key" ON "WorkoutSettings"("settingsId");

-- AddForeignKey
ALTER TABLE "FoodTrackerSettings" ADD CONSTRAINT "FoodTrackerSettings_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "UserSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSettings" ADD CONSTRAINT "WorkoutSettings_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "UserSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

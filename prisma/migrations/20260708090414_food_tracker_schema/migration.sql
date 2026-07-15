-- CreateTable
CREATE TABLE "FoodTracker" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nutritionId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodTracker_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FoodTracker" ADD CONSTRAINT "FoodTracker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodTracker" ADD CONSTRAINT "FoodTracker_nutritionId_fkey" FOREIGN KEY ("nutritionId") REFERENCES "nutrition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

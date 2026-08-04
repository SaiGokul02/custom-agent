import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

type MealTime =
  | "breakfast"
  | "morningSnack"
  | "lunch"
  | "eveningSnack"
  | "dinner";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

// ---------- Create a food log entry ----------

interface CreateFoodLogEntryParams {
  userId: string;
  nutritionId: string;
  quantity: number;
  mealTime: MealTime;
}

export async function createFoodLogEntry({
  userId,
  nutritionId,
  quantity,
  mealTime,
}: CreateFoodLogEntryParams) {
  return prisma.foodTracker.create({
    data: { userId, nutritionId, quantity, mealTime },
  });
}

// ---------- Get raw food logs (list) ----------

interface GetFoodLogsParams {
  userId: string;
  from?: Date;
  to?: Date;
  mealTime?: MealTime;
}

export async function getFoodLogsForUser({
  userId,
  from,
  to,
  mealTime,
}: GetFoodLogsParams) {
  const fromDate = from ?? startOfToday();
  const toDate = to ?? endOfToday();

  const foodLogs = await prisma.foodTracker.findMany({
    where: {
      userId,
      createdAt: { gte: fromDate, lte: toDate },
      ...(mealTime && { mealTime }),
    },
    select: {
      nutrition: true,
      mealTime: true,
      quantity: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return foodLogs.map(
    ({ nutrition, mealTime, quantity, createdAt, updatedAt }) => {
      const multiplier = quantity;

      return {
        food: nutrition.food,
        servingLabel: nutrition.servingLabel,
        baseQuantity: nutrition.baseQuantity,
        mealTime,
        calories: nutrition.calories * multiplier,
        carbohydrates: nutrition.carbohydrates * multiplier,
        protein: nutrition.protein * multiplier,
        fat: nutrition.fat * multiplier,
        fiber: nutrition.fiber * multiplier,
        sugar: nutrition.sugar * multiplier,
        sodium: nutrition.sodium * multiplier,
        quantity,
        createdAt: new Date(createdAt).toLocaleDateString(),
        updatedAt: new Date(updatedAt).toLocaleDateString(),
      };
    },
  );
}

// ---------- Get aggregated nutrition summary ----------

interface GetNutritionSummaryParams {
  userId: string;
  from?: Date;
  to?: Date;
  mealTime?: MealTime;
}

export async function getNutritionSummaryForUser({
  userId,
  from,
  to,
  mealTime,
}: GetNutritionSummaryParams) {
  // Default to today's range whenever either bound is missing.
  // Keeps "no dates given" and "only one date given" both falling back
  // sensibly, instead of leaving the other bound as undefined.
  const fromDate = from ? startOfDay(from) : startOfToday();
  const toDate = to ? endOfDay(to) : endOfToday();

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: {
      nutritionSettings: {
        select: { calorieTarget: true },
      },
    },
  });

  const calorieTarget = settings?.nutritionSettings?.calorieTarget ?? null;

  const foodLogs = await prisma.foodTracker.findMany({
    where: {
      userId,
      createdAt: { gte: fromDate, lte: toDate },
      ...(mealTime && { mealTime }),
    },
    select: {
      nutrition: true,
      quantity: true,
    },
  });

  const round = (value: number) => Number(value.toFixed(2));

  const summary = foodLogs.reduce(
    (acc, { nutrition, quantity }) => {
      const multiplier = quantity / nutrition.baseQuantity;

      acc.consumedCalories += nutrition.calories * multiplier;
      acc.carbohydrates += nutrition.carbohydrates * multiplier;
      acc.protein += nutrition.protein * multiplier;
      acc.fat += nutrition.fat * multiplier;
      acc.fiber += nutrition.fiber * multiplier;
      acc.sugar += nutrition.sugar * multiplier;
      acc.sodium += nutrition.sodium * multiplier;

      return acc;
    },
    {
      consumedCalories: 0,
      carbohydrates: 0,
      protein: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    },
  );

  Object.keys(summary).forEach((key) => {
    summary[key as keyof typeof summary] = round(
      summary[key as keyof typeof summary],
    );
  });

  const isDailySummary =
    !mealTime && fromDate.toDateString() === toDate.toDateString();

  if (isDailySummary) {
    return {
      ...summary,
      calorieTarget,
      remainingCalories:
        calorieTarget === null
          ? null
          : round(calorieTarget - summary.consumedCalories),
    };
  }

  return summary;
}

export async function foodTrackerEntriesForTool({
  userId,
  from,
  to,
  mealTime,
}: GetFoodLogsParams) {
  //   const fromDate = from ?? startOfToday();
  //   const toDate = to ?? endOfToday();
  const fromDate = from ? startOfDay(from) : startOfToday();
  const toDate = to ? endOfDay(to) : endOfToday();

  const foodLogs = await prisma.foodTracker.findMany({
    where: {
      userId,
      createdAt: { gte: fromDate, lte: toDate },
      ...(mealTime && { mealTime }),
    },
    select: {
      nutrition: true,
      mealTime: true,
      quantity: true,
    },
  });

  const groupedLogs = foodLogs.reduce(
    (acc, { nutrition, mealTime, quantity }) => {
      if (!acc[mealTime]) {
        acc[mealTime] = [];
      }

      acc[mealTime].push({
        food: nutrition.food,
        servingLabel: nutrition.servingLabel,
        quantity,
      });

      return acc;
    },
    {},
  );

  return groupedLogs;
}

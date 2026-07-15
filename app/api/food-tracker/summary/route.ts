import { prisma } from "@/lib/prisma";
import { FoodLogsQuerySchema } from "@/lib/validations/foodTracker";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        const result = FoodLogsQuerySchema.safeParse({
            userId: searchParams.get("userId"),
            from: searchParams.get("from"),
            to: searchParams.get("to"),
            mealTime: searchParams.get("mealTime"),
        });

        if (!result.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid request",
                    errors: result.error.issues,
                },
                {
                    status: 400,
                }
            );
        }

        const { userId, from, to, mealTime } = result.data;

        let fromDate = from;
        let toDate = to;

        // Default summary -> today
        if (!fromDate && !toDate) {
            fromDate = new Date();
            fromDate.setHours(0, 0, 0, 0);

            toDate = new Date();
            toDate.setHours(23, 59, 59, 999);
        }

        const settings = await prisma.userSettings.findUnique({
            where: {
                userId,
            },
            select: {
                nutritionSettings: {
                    select: {
                        calorieTarget: true,
                    },
                },
            },
        });

        const calorieTarget =
            settings?.nutritionSettings?.calorieTarget ?? null;

        const foodLogs = await prisma.foodTracker.findMany({
            where: {
                userId,

                createdAt: {
                    ...(fromDate && { gte: fromDate }),
                    ...(toDate && { lte: toDate }),
                },

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
            }
        );

        Object.keys(summary).forEach((key) => {
            summary[key as keyof typeof summary] = round(
                summary[key as keyof typeof summary]
            );
        });

        const isDailySummary =
            !mealTime &&
            fromDate.toDateString() === toDate.toDateString();

        const responseSummary = isDailySummary
            ? {
                  ...summary,

                  calorieTarget,

                  remainingCalories:
                      calorieTarget === null
                          ? null
                          : round(
                                calorieTarget -
                                    summary.consumedCalories
                            ),
              }
            : summary;

        return NextResponse.json(
            {
                success: true,

                summary: responseSummary,
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            {
                success: false,
                message: "Internal Server Error",
            },
            {
                status: 500,
            }
        );
    }
}
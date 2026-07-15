import { NextResponse } from "next/server";
import { foodRecordSchema, FoodLogsQuerySchema } from "@/lib/validations/foodTracker"
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const result = foodRecordSchema.safeParse(body);

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

        const { userId, nutritionId, quantity, mealTime } = result.data;

        const createFoodRecord = await prisma.foodTracker.create({
            data: {
                userId,
                nutritionId,
                quantity,
                mealTime
            }
        })

        return NextResponse.json({
            success: true,
            message: 'Successfully added the food item to tracker.'
        }, { status: 201 })
    } catch (error) {
        return NextResponse.json({
            error,
        }, { status: 500 })
    }
}

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
                mealTime: true,
                quantity: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        // const response = foodLogs.map(
        //     ({ nutrition, mealTime, quantity, createdAt, updatedAt }) => {
        //         const multiplier = quantity / nutrition.baseQuantity;

        //         return {
        //             food: nutrition.food,
        //             servingLabel: nutrition.servingLabel,
        //             baseQuantity: nutrition.baseQuantity,

        //             mealTime,

        //             calories: nutrition.calories * multiplier,
        //             carbohydrates: nutrition.carbohydrates * multiplier,
        //             protein: nutrition.protein * multiplier,
        //             fat: nutrition.fat * multiplier,
        //             fiber: nutrition.fiber * multiplier,
        //             sugar: nutrition.sugar * multiplier,
        //             sodium: nutrition.sodium * multiplier,

        //             quantity,

        //             createdAt: new Date(createdAt).toLocaleDateString(),
        //             updatedAt: new Date(updatedAt).toLocaleDateString(),
        //         };
        //     }
        // );

        const response = foodLogs.map(
            ({ nutrition, mealTime, quantity, createdAt, updatedAt }) => {
                const multiplier = quantity; // quantity = number of servings logged

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
            }
        );

        return NextResponse.json(
            {
                success: true,
                foodLogs: response,
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

// export async function GET(req: Request) {
//     try {
//         const { searchParams } = new URL(req.url);

//         const result = FoodLogsQuerySchema.safeParse({
//             userId: searchParams.get("userId"),
//             from: searchParams.get("from"),
//             to: searchParams.get("to"),
//             mealTime: searchParams.get("mealTime"),
//         });

//         if (!result.success) {
//             return NextResponse.json(
//                 {
//                     success: false,
//                     message: "Invalid request",
//                     errors: result.error.issues,
//                 },
//                 {
//                     status: 400,
//                 }
//             );
//         }

//         const { userId, from, to, mealTime } = result.data;

//         let period: "day" | "range" | "all";

//         if (!from && !to) {
//             period = "all";
//         } else if (
//             from &&
//             to &&
//             from.toDateString() === to.toDateString()
//         ) {
//             period = "day";
//         } else {
//             period = "range";
//         }

//         const settings = await prisma.userSettings.findUnique({
//             where: {
//                 userId,
//             },
//             select: {
//                 nutritionSettings: {
//                     select: {
//                         calorieTarget: true,
//                     },
//                 },
//             },
//         });

//         const getAllFoodLogs = await prisma.foodTracker.findMany({
//             where: {
//                 userId,

//                 ...(from || to
//                     ? {
//                         createdAt: {
//                             ...(from && { gte: from }),
//                             ...(to && { lte: to }),
//                         },
//                     }
//                     : {}),

//                 ...(mealTime && { mealTime }),
//             },

//             select: {
//                 nutrition: true,
//                 mealTime: true,
//                 quantity: true,
//                 createdAt: true,
//                 updatedAt: true,
//             },
//         });

//         const foodLogs = getAllFoodLogs.map(
//             ({ nutrition, mealTime, quantity, createdAt, updatedAt }) => {
//                 const multiplier = quantity / nutrition.baseQuantity;

//                 return {
//                     food: nutrition.food,
//                     servingLabel: nutrition.servingLabel,
//                     baseQuantity: nutrition.baseQuantity,

//                     mealTime,

//                     calories: nutrition.calories * multiplier,
//                     carbohydrates: nutrition.carbohydrates * multiplier,
//                     protein: nutrition.protein * multiplier,
//                     fat: nutrition.fat * multiplier,
//                     fiber: nutrition.fiber * multiplier,
//                     sugar: nutrition.sugar * multiplier,
//                     sodium: nutrition.sodium * multiplier,

//                     quantity,

//                     createdAt: new Date(createdAt).toLocaleDateString(),
//                     updatedAt: new Date(updatedAt).toLocaleDateString(),
//                 };
//             }
//         );

//         const round = (value: number) => Number(value.toFixed(2));

//         const summary = foodLogs.reduce(
//             (acc, item) => {
//                 acc.consumedCalories += item.calories;
//                 acc.carbohydrates += item.carbohydrates;
//                 acc.protein += item.protein;
//                 acc.fat += item.fat;
//                 acc.fiber += item.fiber;
//                 acc.sugar += item.sugar;
//                 acc.sodium += item.sodium;

//                 return acc;
//             },
//             {
//                 consumedCalories: 0,
//                 carbohydrates: 0,
//                 protein: 0,
//                 fat: 0,
//                 fiber: 0,
//                 sugar: 0,
//                 sodium: 0,
//             }
//         );

//         Object.keys(summary).forEach((key) => {
//             summary[key as keyof typeof summary] = round(
//                 summary[key as keyof typeof summary]
//             );
//         });

//         const responseSummary =
//             period === "day"
//                 ? {
//                     ...summary,
//                     calorieTarget:
//                         settings?.nutritionSettings?.calorieTarget ?? null,
//                     remainingCalories:
//                         settings?.nutritionSettings?.calorieTarget == null
//                             ? null
//                             : round(
//                                 settings.nutritionSettings.calorieTarget -
//                                 summary.consumedCalories
//                             ),
//                 }
//                 : summary;

//         return NextResponse.json(
//             {
//                 success: true,
//                 period,
//                 summary: responseSummary,
//                 foodLogs,
//             },
//             {
//                 status: 200,
//             }
//         );
//     } catch (error) {
//         console.error(error);

//         return NextResponse.json(
//             {
//                 success: false,
//                 message: "Internal Server Error",
//             },
//             {
//                 status: 500,
//             }
//         );
//     }
// }
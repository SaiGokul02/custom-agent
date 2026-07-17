import { NextResponse } from "next/server";
import { foodRecordSchema, FoodLogsQuerySchema } from "@/lib/validations/foodTracker";
import { requireUserId } from "@/lib/require-auth";
import { createFoodLogEntry, getFoodLogsForUser } from "@/features/food-tracker/food-tracker.service";

export async function POST(req: Request) {
    try {
        const { userId, error } = await requireUserId();
        if (error) return error;

        const body = await req.json();

        // Explicitly override userId with the verified one — never trust
        // whatever the client/tool sent in the body under that key.
        const result = foodRecordSchema.safeParse({ ...body, userId });

        if (!result.success) {
            return NextResponse.json(
                { success: false, message: "Invalid request", errors: result.error.issues },
                { status: 400 }
            );
        }

        const { nutritionId, quantity, mealTime } = result.data;

        await createFoodLogEntry({ userId, nutritionId, quantity, mealTime });

        return NextResponse.json(
            { success: true, message: "Successfully added the food item to tracker." },
            { status: 201 }
        );
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { userId, error } = await requireUserId();
        if (error) return error;

        const { searchParams } = new URL(req.url);

        const result = FoodLogsQuerySchema.safeParse({
            from: searchParams.get("from"),
            to: searchParams.get("to"),
            mealTime: searchParams.get("mealTime"),
        });

        if (!result.success) {
            return NextResponse.json(
                { success: false, message: "Invalid request", errors: result.error.issues },
                { status: 400 }
            );
        }

        const { from, to, mealTime } = result.data;

        const foodLogs = await getFoodLogsForUser({ userId, from, to, mealTime });

        return NextResponse.json({ success: true, foodLogs }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
}


// import { NextResponse } from "next/server";
// import { foodRecordSchema, FoodLogsQuerySchema } from "@/lib/validations/foodTracker"
// import { prisma } from "@/lib/prisma";
// import { requireUserId } from "@/lib/require-auth";

// export async function POST(req: Request) {
//     try {
//         const body = await req.json();

//         const { userId: user_id, error } = await requireUserId();

//         if (error) return error;

//         const bodyReceived = {
//             ...body,
//             user_id
//         }

//         const result = foodRecordSchema.safeParse(bodyReceived);

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

//         const { userId, nutritionId, quantity, mealTime } = result.data;

//         const createFoodRecord = await prisma.foodTracker.create({
//             data: {
//                 userId,
//                 nutritionId,
//                 quantity,
//                 mealTime
//             }
//         })

//         return NextResponse.json({
//             success: true,
//             message: 'Successfully added the food item to tracker.'
//         }, { status: 201 })
//     } catch (error) {
//         return NextResponse.json({
//             error,
//         }, { status: 500 })
//     }
// }

// export async function GET(req: Request) {
//     try {
//         const { searchParams } = new URL(req.url);


//         const { userId: user_id, error } = await requireUserId();

//         if (error) return error;

//         console.log("user loging ", user_id);


//         const result = FoodLogsQuerySchema.safeParse({
//             userId: user_id,
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

//         let fromDate = from;
//         let toDate = to;

//         // Default summary -> today
//         if (!fromDate && !toDate) {
//             fromDate = new Date();
//             fromDate.setHours(0, 0, 0, 0);

//             toDate = new Date();
//             toDate.setHours(23, 59, 59, 999);
//         }

//         const foodLogs = await prisma.foodTracker.findMany({
//             where: {
//                 userId,

//                 createdAt: {
//                     ...(fromDate && { gte: fromDate }),
//                     ...(toDate && { lte: toDate }),
//                 },

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

//         const response = foodLogs.map(
//             ({ nutrition, mealTime, quantity, createdAt, updatedAt }) => {
//                 const multiplier = quantity; // quantity = number of servings logged

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

//         return NextResponse.json(
//             {
//                 success: true,
//                 foodLogs: response,
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
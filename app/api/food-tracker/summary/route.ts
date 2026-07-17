import { requireUserId } from "@/lib/require-auth";
import { FoodLogsQuerySchema } from "@/lib/validations/foodTracker";
import { getNutritionSummaryForUser } from "@/features/food-tracker/food-tracker.service";
import { NextResponse } from "next/server";

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

        const summary = await getNutritionSummaryForUser({ userId, from, to, mealTime });

        return NextResponse.json({ success: true, summary }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
}
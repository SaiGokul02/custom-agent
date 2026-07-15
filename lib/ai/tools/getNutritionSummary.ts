import { tool } from "@langchain/core/tools";
import { z } from "zod";

const USER_ID = "cmramiqfw0000gnqzt162j5kh";

export const getNutritionSummary = tool(
    async ({ from, to, mealTime }) => {
        try {
            const params = new URLSearchParams({
                userId: USER_ID,
            });

            if (from) {
                params.append("from", new Date(from).toISOString());
            }

            if (to) {
                params.append("to", new Date(to).toISOString());
            }

            if (mealTime) {
                params.append("mealTime", mealTime);
            }

            console.log(from, to, mealTime);

            const res = await fetch(
                `http://localhost:3000/api/food-tracker/summary?${params.toString()}`
            );

            if (!res.ok) {
                throw new Error("Failed to fetch nutrition summary");
            }

            return await res.json();
        } catch (error) {
            console.error(error);

            return {
                success: false,
                message: "Failed to fetch nutrition summary.",
            };
        }
    },
    {
        name: "get_nutrition_summary",
        description: `
Gets the user's nutrition summary.

Rules:
1. If from and to are omitted, return today's summary.
2. If from and to are provided, return the summary for that date range.
3. If mealTime is provided, return the summary only for that meal.
4. All parameters are optional.
`,
        schema: z.object({
            from: z
                .string()
                .optional()
                .describe("Start date in YYYY-MM-DD format"),
            to: z
                .string()
                .optional()
                .describe("End date in YYYY-MM-DD format"),
            mealTime: z
                .enum([
                    "breakfast",
                    "morningSnack",
                    "lunch",
                    "eveningSnack",
                    "dinner",
                ])
                .optional(),
        })
    }
);
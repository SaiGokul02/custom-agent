import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getNutritionSummaryForUser } from "@/features/food-tracker/food-tracker.service";

export const getNutritionSummary = tool(
  async ({ from, to, mealTime }, config) => {
    const userId = config.context.userId;
    console.log("user id from context: ", userId);

    if (!userId) {
      return { success: false, message: "Missing userId in tool config" };
    }

    try {
      const summary = await getNutritionSummaryForUser({
        userId,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        mealTime,
      });

      return { success: true, summary };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Failed to fetch nutrition summary." };
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
5. Never give nutrition summary from the context you have, always use this data.
`,
    schema: z.object({
      from: z.string().optional().describe("Start date in YYYY-MM-DD format"),
      to: z.string().optional().describe("End date in YYYY-MM-DD format"),
      mealTime: z
        .enum(["breakfast", "morningSnack", "lunch", "eveningSnack", "dinner"])
        .optional(),
    }),
  },
);

// import { tool } from "@langchain/core/tools";
// import { z } from "zod";
// import type { RunnableConfig } from "@langchain/core/runnables";

// export const getNutritionSummary = tool(
//     async ({ from, to, mealTime }, config: RunnableConfig) => {
//         const userId = config.configurable?.userId as string;

//         if (!userId) {
//             return {
//                 success: false,
//                 message: "Missing userId in tool config",
//             };
//         }

//         try {
//             const params = new URLSearchParams({
//                 userId,
//             });

//             if (from) {
//                 params.append("from", new Date(from).toISOString());
//             }

//             if (to) {
//                 params.append("to", new Date(to).toISOString());
//             }

//             if (mealTime) {
//                 params.append("mealTime", mealTime);
//             }

//             const res = await fetch(
//                 `http://localhost:3000/api/food-tracker/summary?${params.toString()}`
//             );

//             if (!res.ok) {
//                 throw new Error("Failed to fetch nutrition summary");
//             }

//             return await res.json();
//         } catch (error) {
//             console.error(error);

//             return {
//                 success: false,
//                 message: "Failed to fetch nutrition summary.",
//             };
//         }
//     },
//     {
//         name: "get_nutrition_summary",
//         description: `
// Gets the user's nutrition summary.

// Rules:
// 1. If from and to are omitted, return today's summary.
// 2. If from and to are provided, return the summary for that date range.
// 3. If mealTime is provided, return the summary only for that meal.
// 4. All parameters are optional.
// `,
//         schema: z.object({
//             from: z
//                 .string()
//                 .optional()
//                 .describe("Start date in YYYY-MM-DD format"),
//             to: z
//                 .string()
//                 .optional()
//                 .describe("End date in YYYY-MM-DD format"),
//             mealTime: z
//                 .enum([
//                     "breakfast",
//                     "morningSnack",
//                     "lunch",
//                     "eveningSnack",
//                     "dinner",
//                 ])
//                 .optional(),
//         })
//     }
// );

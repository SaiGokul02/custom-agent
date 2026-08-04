import { foodTrackerEntriesForTool } from "@/features/food-tracker/food-tracker.service";
import { tool } from "langchain";
import z from "zod";

export const getFoodTrackerEntries = tool(
  async ({ from, to, mealTime }, config) => {
    const userId = config.context.userId;
    console.log("user id from context: ", userId);

    if (!userId) {
      return { success: false, message: "Missing userId in tool config" };
    }

    try {
      const foodTrackerEntries = await foodTrackerEntriesForTool({
        userId,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        mealTime,
      });

      return { success: true, foodTrackerEntries };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: "Failed to fetch food tracker entries.",
      };
    }
  },
  {
    name: "get_food_tracker_entries",
    description: `
            1. This tool returns the food tracker entries for today by default.
            2. If from and to date are provided then it returns the food entries for that range.
            3. If meal time is provided it returns the food entries for that meal time only. 
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

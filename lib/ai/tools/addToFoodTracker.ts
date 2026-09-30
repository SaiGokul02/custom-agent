import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { createFoodLogEntry } from "@/features/food-tracker/food-tracker.service";

export const addToFoodTracker = tool(
  async ({ foods, mealTime }, config) => {
    console.log("Executing addToFoodTracker:");
    console.log("foods:", foods);
    console.log("mealTime:", mealTime);

    const userId = config.context.userId;

    if (!userId) {
      return {
        success: false,
        error: "Missing userId in tool config",
      };
    }

    const responses = [];

    for (const food of foods) {
      try {
        await createFoodLogEntry({
          userId,
          nutritionId: food.nutritionId,
          quantity: food.quantity,
          mealTime,
        });

        responses.push({
          success: true,
          nutritionId: food.nutritionId,
          food: food.food,
          servingLabel: food.servingLabel,
          quantity: food.quantity,
          mealTime,
        });
      } catch (error) {
        console.error(error);

        responses.push({
          success: false,
          nutritionId: food.nutritionId,
          food: food.food,
          servingLabel: food.servingLabel,
          quantity: food.quantity,
          mealTime,
          error: "Failed to add item",
        });
      }
    }

    const allSuccessful = responses.every((response) => response.success);

    return {
      success: allSuccessful,

      // IMPORTANT:
      // These are the arguments that were actually executed.
      executedAction: {
        mealTime,
        foods,
      },

      responses,
    };
  },
  {
    name: "add_to_food_tracker",

    description: `
Adds foods to the user's tracker.

Only call this AFTER search_foods.

Never invent a nutritionId.

Always use the nutritionId returned by search_foods.

IMPORTANT:
The mealTime, foods, servingLabel, and quantity provided to this
tool are the exact values that will be saved to the user's tracker.

After this tool executes, use the tool result as the source of truth
for what was actually added.

If a previous user request conflicts with the executedAction in the
tool result, the executedAction is authoritative.
`,

    schema: z.object({
      mealTime: z.enum([
        "breakfast",
        "morningSnack",
        "lunch",
        "eveningSnack",
        "dinner",
      ]),

      foods: z.array(
        z.object({
          nutritionId: z.string(),
          food: z.string(),
          servingLabel: z.string(),
          quantity: z.number(),
        }),
      ),
    }),
  },
);

// import { tool } from "@langchain/core/tools";
// import { z } from "zod";
// import type { RunnableConfig } from "@langchain/core/runnables";
// import { createFoodLogEntry } from "@/features/food-tracker/food-tracker.service";

// export const addToFoodTracker = tool(
//   async ({ foods, mealTime }, config) => {
//     console.log(foods, mealTime);
//     // const userId = config.configurable?.userId as string;
//     const userId = config.context.userId;

//     if (!userId) {
//       return { success: false, error: "Missing userId in tool config" };
//     }

//     const responses = [];

//     for (const food of foods) {
//       try {
//         await createFoodLogEntry({
//           userId,
//           nutritionId: food.nutritionId,
//           quantity: food.quantity,
//           mealTime,
//         });
//         responses.push({ success: true, nutritionId: food.nutritionId });
//       } catch (error) {
//         console.error(error);
//         responses.push({
//           success: false,
//           nutritionId: food.nutritionId,
//           error: "Failed to add item",
//         });
//       }
//     }

//     return {
//       success: true,
//       responses,
//     };
//   },
//   {
//     name: "add_to_food_tracker",
//     description: `
// Adds foods to the user's tracker.

// Only call this AFTER search_foods.

// Never invent a nutritionId.

// Always use the nutritionId returned by search_foods.
// `,
//     schema: z.object({
//       mealTime: z.enum([
//         "breakfast",
//         "morningSnack",
//         "lunch",
//         "eveningSnack",
//         "dinner",
//       ]),
//       foods: z.array(
//         z.object({
//           nutritionId: z.string(),
//           food: z.string(),
//           servingLabel: z.string(),
//           quantity: z.number(),
//         }),
//       ),
//     }),
//   },
// );

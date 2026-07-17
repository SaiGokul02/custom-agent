import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { RunnableConfig } from "@langchain/core/runnables";
import { createFoodLogEntry } from "@/features/food-tracker/food-tracker.service";

export const addToFoodTracker = tool(
  async ({ foods, mealTime }, config: RunnableConfig) => {
    const userId = config.configurable?.userId as string;

    if (!userId) {
      return { success: false, error: "Missing userId in tool config" };
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

        responses.push({ success: true, nutritionId: food.nutritionId });
      } catch (error) {
        console.error(error);
        responses.push({ success: false, nutritionId: food.nutritionId, error: "Failed to add item" });
      }
    }

    return {
      success: true,
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
          quantity: z.number(),
        })
      ),
    }),
  }
);



// import { tool } from "@langchain/core/tools";
// import { z } from "zod";

// const USER_ID = "cmrlvfz4j00009wm209ldemrl";

// export const addToFoodTracker = tool(
//   async ({ foods, mealTime }) => {
//     console.log(foods, mealTime);
//     const responses = [];

//     for (const food of foods) {
//       const res = await fetch("http://localhost:3000/api/food-tracker", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           userId: USER_ID,
//           nutritionId: food.nutritionId,
//           quantity: food.quantity,
//           mealTime,
//         }),
//       });

//       responses.push(await res.json());
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
//           quantity: z.number(),
//         })
//       ),
//     }),
//   }
// );
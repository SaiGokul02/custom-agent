import { tool } from "langchain";
import * as z from "zod";

const getNutrition = tool(
    async ({ foodItems }) => {
        console.log("foodItems ", foodItems);
    },
    {
        name: "get_nutrition",
        description: "Get the nutrition details for the list of food items",
        schema: z.object({
            foodItems: z
                .array(z.string())
                .describe("The list of items to get nutrition for"),
        }),
    }
);

// const searchFood = tool(
//     async ({ foodItems }) => {
//         console.log(foodItems);
//         const matchedFoods = Object.fromEntries(
//             await Promise.all(
//                 foodItems.map(async (item) => {
//                     const res = await fetch(`/api/nutrition/search-food?name=${item}`);
//                     const data = await res.json();

//                     return [item, data];
//                 })
//             )
//         );
//     },
//     {
//         name: "search_food",
//         description: "Searches the nutrition API for the list of food items",
//         schema: z.object({
//             foodItems: z
//                 .array(z.string())
//                 .describe("The list of items to search in nutrition API"),
//         }),
//     }
// )

// const addFoodToTracker = tool(
//     async ({ foodItems }) => {
//         const matchedFoodItems = await searchFood.invoke({
//             foodItems
//         });


//     },
//     {
//         name: "add_food_to_tracker",
//         description: "Select the best option from matched food items and add it to tracker",
//         schema: z.object({
//             foodItems: z
//                 .array(z.string())
//                 .describe("The list of items to get nutrition information"),
//         }),
//     }
// )

export default getNutrition;
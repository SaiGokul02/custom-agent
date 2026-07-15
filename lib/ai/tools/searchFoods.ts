import { tool } from "langchain";
import * as z from "zod";

const searchFoods = tool(
    async ({ foodItems }) => {
        const matchedFoods = Object.fromEntries(
            await Promise.all(
                foodItems.map(async (item) => {
                    const res = await fetch(
                        `http://localhost:3000/api/nutrition/search-food?name=${encodeURIComponent(
                            item
                        )}`
                    );

                    const data = await res.json();

                    // Only return the matched foods array
                    return [item, data.matchedFoods];
                })
            )
        );

        console.log("matched foods ", matchedFoods);
        return matchedFoods;
    },
    {
        name: "search_foods",
        description: `
Search the nutrition database for the provided food names.

Returns ALL possible matching nutrition entries.

Example input:
["apple", "banana"]

Example output:
{
  "apple": [
    {
      "id": "...",
      "food": "Apple",
      "servingLabel": "Medium (3\\" dia)",
      "baseQuantity": 1,
      "calories": 95
    }
  ],
  "banana": [
    {
      "id": "...",
      "food": "Banana",
      "servingLabel": "Medium (7\\" to 7-7/8\\" long)",
      "baseQuantity": 1,
      "calories": 105
    }
  ]
}

Never choose the best match yourself. Return every match exactly as received.
`,
        schema: z.object({
            foodItems: z
                .array(z.string())
                .describe("The list of food names to search for."),
        }),
    }
);

export default searchFoods;
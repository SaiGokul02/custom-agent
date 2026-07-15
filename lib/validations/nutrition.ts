import { z } from "zod";

export const NutritionSchema = z.object({
    food: z.string().trim().min(1),
    servingLabel: z.string().trim().min(1),
    baseQuantity: z.number().positive(),
    calories: z.number().nonnegative(),
    protein: z.number().nonnegative(),
    fat: z.number().nonnegative(),
    fiber: z.number().nonnegative(),
    carbohydrates: z.number().nonnegative(),
    sugar: z.number().nonnegative(),
    sodium: z.number().nonnegative(),
});

export const NutritionRequestSchema = z.object({
    foodItems: z.array(NutritionSchema)
});

export const NutritionQuerySchema = z.object({
    name: z.string().trim().min(1),
})
import { z } from "zod";

export const settingsSchema = z.object({
    userId: z.string().trim().min(3).max(30),
    calorieTarget: z.number().nonnegative(),
})
import { z } from "zod";

export const foodRecordSchema = z.object({
    "userId": z.string().trim().min(3).max(30),
    "nutritionId": z.string().trim().min(3).max(30),
    "quantity": z.number().min(1),
    "mealTime": z.enum(['breakfast', 'morningSnack', 'lunch', 'eveningSnack', 'dinner'])
})

const dateAtTime = (
    hours: number,
    minutes: number,
    seconds: number,
    milliseconds: number
) =>
    z.preprocess((value) => {
        if (value == null) return undefined;

        const date = new Date(value as string);
        date.setHours(hours, minutes, seconds, milliseconds);

        return date;
    }, z.date().optional());

export const FoodLogsQuerySchema = z.object({
    userId: z.string().trim().min(3).max(30),

    from: dateAtTime(0, 0, 0, 0),

    to: dateAtTime(23, 59, 59, 999),

    mealTime: z.preprocess(
        (value) => value == null ? undefined : value,
        z.enum([
            "breakfast",
            "morningSnack",
            "lunch",
            "eveningSnack",
            "dinner",
        ]).optional()
    ),
});

// export const FoodLogsQuerySchema = z.object({
//     userId: z.string().trim().min(3).max(30),

//     from: z.preprocess(
//         (value) => value === null ? undefined : value,
//         z.coerce.date().optional()
//     ),

//     to: z.preprocess(
//         (value) => value === null ? undefined : value,
//         z.coerce.date().optional()
//     ),

//     mealTime: z.preprocess(
//         (value) => value === null ? undefined : value,
//         z.enum([
//             "breakfast",
//             "morningSnack",
//             "lunch",
//             "eveningSnack",
//             "dinner",
//         ]).optional()
//     )
// });
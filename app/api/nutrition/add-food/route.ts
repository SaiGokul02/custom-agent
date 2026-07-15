import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NutritionRequestSchema, NutritionQuerySchema } from "@/lib/validations/nutrition"

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const result = NutritionRequestSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid request",
                    errors: result.error.issues,
                },
                {
                    status: 400,
                }
            );
        }

        const { foodItems } = result.data;

        await prisma.nutrition.createMany({
            data: foodItems,
        });

        return NextResponse.json(
            {
                success: true,
            },
            {
                status: 201,
            }
        );
    } catch (error) {
        console.error(error);

        return NextResponse.json(
            {
                success: false,
                message: "Internal server error",
            },
            {
                status: 500,
            }
        );
    }
}

// export async function GET(req: Request) {
//     try {
//         const { searchParams } = new URL(req.url);

//         const result = NutritionQuerySchema.safeParse({
//             name: searchParams.get("name")
//         });

//         if (!result.success) {
//             return NextResponse.json(
//                 {
//                     success: false,
//                     message: "Invalid request",
//                     errors: result.error.issues,
//                 },
//                 { status: 400 }
//             );
//         }

//         const { name } = result.data;

//         const matchedFoods = await prisma.nutrition.findMany({
//             where: {
//                 food: {
//                     contains: name,
//                     mode: 'insensitive'
//                 }
//             }
//         });

//         return NextResponse.json(
//             {
//                 success: true,
//                 matchedFoods
//             },
//             {
//                 status: 200
//             }
//         )


//     } catch (error) {
//         return NextResponse.json(
//             {
//                 error
//             },
//             {
//                 status: 500
//             })
//     }
// }
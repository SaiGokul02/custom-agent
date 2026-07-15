import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NutritionQuerySchema } from "@/lib/validations/nutrition"

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        const result = NutritionQuerySchema.safeParse({
            name: searchParams.get("name")
        });

        if (!result.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid request",
                    errors: result.error.issues,
                },
                { status: 400 }
            );
        }

        const { name } = result.data;

        const matchedFoods = await prisma.nutrition.findMany({
            where: {
                food: {
                    contains: name,
                    mode: 'insensitive'
                }
            },
            select: {
                id: true,
                food: true,
                servingLabel: true,
                baseQuantity: true,
                calories: true
            }
        });

        return NextResponse.json(
            {
                success: true,
                matchedFoods
            },
            {
                status: 200
            }
        )
    } catch (error) {
        return NextResponse.json(
            {
                error
            },
            {
                status: 500
            })
    }
}
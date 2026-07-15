import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { settingsSchema } from "@/lib/validations/settings";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                {
                    error: 'Missing userId parameter'
                },
                {
                    status: 400
                }
            )
        }

        const user = await prisma.users.findUnique({
            where: {
                id: userId
            },
            include: {
                settings: true
            }
        });

        return NextResponse.json({
            user
        }, {
            status: 200
        })


    } catch (error) {
        return NextResponse.json(
            {
                error: 'Internal server error'
            },
            {
                status: 500
            }
        )
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();

        const result = settingsSchema.safeParse(body);

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

        const { userId, calorieTarget } = result.data;

        const settings = await prisma.userSettings.update({
            where: {
                userId
            },
            data: {
                nutritionSettings: {
                    upsert: {
                        create: {
                            calorieTarget
                        },
                        update: {
                            calorieTarget
                        }
                    }
                }
            }
        });

        return NextResponse.json(
            {
                message: "Successfully set the settings"
            }
            , {
                status: 201
            })
    } catch (error) {
        return NextResponse.json(
            {
                error: "Internal server error"
            }
            , {
                status: 500
            })
    }
}
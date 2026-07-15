import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import generateToken from '@/lib/jwt';

export async function verifyPassword(password, hash) {
    const isMatch = await bcrypt.compare(password, hash)
    return isMatch;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            const error = new Error("Please fill email and password") as Error & {
                status: number;
            };
            error.status = 400;
            throw error;
        }

        const user = await prisma.users.findUnique({
            where: {
                email,
            },
        });

        if (!user) {
            const error = new Error("User doesn't exist") as Error & {
                status: number;
            };
            error.status = 401;
            throw error;
        }

        const hashPassword = user.password;

        const verify = await verifyPassword(password, hashPassword);

        if (!verify) {
            const error = new Error("Please enter correct password") as Error & {
                status: number;
            };
            error.status = 401;
            throw error;
        }

        // 3. Construct the safe payload (No password included)
        const payload = {
            id: user.id,
            username: user.username,
            email: user.email
        };

        // 4. Generate the JWT (maps to `new SignJWT(payload)`)
        const token = await generateToken(payload);


        return NextResponse.json(
            {
                message: "Logged in successfully!",
                user: {
                    userId: user.id,
                    username: user.username,
                    email: user.email,
                    jwt: token
                },
            },
            {
                status: 201,
            }
        );
    } catch (error) {
        console.error(error);

        const err = error as Error & { status?: number };

        return NextResponse.json(
            {
                error: err.message || "Internal Server Error",
            },
            {
                status: err.status || 500,
            }
        );
    }
}
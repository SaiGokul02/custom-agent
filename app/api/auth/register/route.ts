import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import generateToken from "@/lib/jwt";
import { hashPassword } from "@/lib/auth-utils"

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { username, email, password } = body;

        if (!username || !email || !password) {
            return NextResponse.json(
                { error: "Please fill all the required details for registration." },
                { status: 400 }
            );
        }

        const [existingEmail, existingUsername] = await Promise.all([
            prisma.users.findUnique({ where: { email } }),
            prisma.users.findUnique({ where: { username } }),
        ]);

        if (existingEmail && existingUsername) {
            return NextResponse.json(
                { error: "Email and username are already in use." },
                { status: 409 }
            );
        }
        if (existingEmail) {
            return NextResponse.json(
                { error: "An account with this email already exists." },
                { status: 409 }
            );
        }
        if (existingUsername) {
            return NextResponse.json(
                { error: "This username is already taken." },
                { status: 409 }
            );
        }

        const hashedPassword = await hashPassword(password);

        const createdUser = await prisma.users.create({
            data: {
                username,
                email,
                password: hashedPassword,
                settings: { create: {} },
            },
        });

        const token = await generateToken({
            id: createdUser.id,
            username: createdUser.username,
            email: createdUser.email,
        });

        const res = NextResponse.json(
            {
                message: "Registered successfully!",
                user: {
                    userId: createdUser.id,
                    username: createdUser.username,
                    email: createdUser.email,
                },
            },
            { status: 201 }
        );

        res.cookies.set("jwt", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 2, // keep in sync with generateToken's expiry
        });

        return res;
    } catch (error) {
        console.error(error);

        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            const target = error.meta?.target as string[];

            if (target.includes("email")) {
                return NextResponse.json(
                    { error: "An account with this email already exists." },
                    { status: 409 }
                );
            }
            if (target.includes("username")) {
                return NextResponse.json(
                    { error: "This username is already taken." },
                    { status: 409 }
                );
            }
            return NextResponse.json({ error: "A unique field already exists." }, { status: 409 });
        }

        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


// import bcrypt from "bcryptjs";
// import { NextResponse } from "next/server";
// import { Prisma } from "@/app/generated/prisma/client";
// import { prisma } from "@/lib/prisma";
// import generateToken from "@/lib/jwt";

// export async function hashPassword(password: string) {
//     const salt = await bcrypt.genSalt(10);
//     return bcrypt.hash(password, salt);
// }

// export async function verifyPassword(password: string, hash: string) {
//     return bcrypt.compare(password, hash);
// }

// export async function POST(req: Request) {
//     try {
//         const body = await req.json();
//         const { username, email, password } = body;

//         if (!username || !email || !password) {
//             return NextResponse.json(
//                 {
//                     error: "Please fill all the required details for registration.",
//                 },
//                 {
//                     status: 400,
//                 }
//             );
//         }

//         // Check if email or username already exists
//         const [existingEmail, existingUsername] = await Promise.all([
//             prisma.users.findUnique({
//                 where: {
//                     email,
//                 },
//             }),
//             prisma.users.findUnique({
//                 where: {
//                     username,
//                 },
//             }),
//         ]);

//         if (existingEmail && existingUsername) {
//             return NextResponse.json(
//                 {
//                     error: "Email and username are already in use.",
//                 },
//                 {
//                     status: 409,
//                 }
//             );
//         }

//         if (existingEmail) {
//             return NextResponse.json(
//                 {
//                     error: "An account with this email already exists.",
//                 },
//                 {
//                     status: 409,
//                 }
//             );
//         }

//         if (existingUsername) {
//             return NextResponse.json(
//                 {
//                     error: "This username is already taken.",
//                 },
//                 {
//                     status: 409,
//                 }
//             );
//         }

//         const hashedPassword = await hashPassword(password);

//         const createdUser = await prisma.users.create({
//             data: {
//                 username,
//                 email,
//                 password: hashedPassword,
//                 settings: {
//                     create: {}
//                 }
//             },
//         });

//         // Construct the safe payload (No password included)
//         const payload = {
//             id: createdUser.id,
//             username: createdUser.username,
//             email: createdUser.email
//         };

//         // 4. Generate the JWT (maps to `new SignJWT(payload)`)
//         const token = await generateToken(payload);

//         return NextResponse.json(
//             {
//                 message: "Registered successfully!",
//                 user: {
//                     userId: createdUser.id,
//                     username: createdUser.username,
//                     email: createdUser.email,
//                     jwt: token
//                 },
//             },
//             {
//                 status: 201,
//             }
//         );
//     } catch (error) {
//         console.error(error);

//         // Safety net for race conditions
//         if (error instanceof Prisma.PrismaClientKnownRequestError) {
//             if (error.code === "P2002") {
//                 const target = error.meta?.target as string[];

//                 if (target.includes("email")) {
//                     return NextResponse.json(
//                         {
//                             error: "An account with this email already exists.",
//                         },
//                         {
//                             status: 409,
//                         }
//                     );
//                 }

//                 if (target.includes("username")) {
//                     return NextResponse.json(
//                         {
//                             error: "This username is already taken.",
//                         },
//                         {
//                             status: 409,
//                         }
//                     );
//                 }

//                 return NextResponse.json(
//                     {
//                         error: "A unique field already exists.",
//                     },
//                     {
//                         status: 409,
//                     }
//                 );
//             }
//         }

//         return NextResponse.json(
//             {
//                 error: "Internal Server Error",
//             },
//             {
//                 status: 500,
//             }
//         );
//     }
// }
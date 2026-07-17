import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import generateToken from "@/lib/jwt";
import {verifyPassword} from "@/lib/auth-utils";

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Please fill email and password" }, { status: 400 });
        }

        const user = await prisma.users.findUnique({ where: { email } });

        // Same generic error for "no such user" and "wrong password" —
        // prevents attackers from enumerating registered emails.
        const genericError = () =>
            NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

        if (!user) return genericError();

        const isValid = await verifyPassword(password, user.password);
        if (!isValid) return genericError();

        const token = await generateToken({
            id: user.id,
            username: user.username,
            email: user.email,
        });

        const res = NextResponse.json(
            {
                message: "Logged in successfully!",
                user: { userId: user.id, username: user.username, email: user.email },
            },
            { status: 200 }
        );

        // httpOnly => unreadable by client-side JS (mitigates XSS token theft)
        // secure    => only sent over HTTPS
        // sameSite  => "lax" allows normal top-level navigation, blocks most CSRF vectors
        res.cookies.set("jwt", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 days — keep in sync with generateToken's expiry
        });

        return res;
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


// import bcrypt from 'bcryptjs';
// import { NextResponse } from 'next/server';
// import { prisma } from "@/lib/prisma";
// import generateToken from '@/lib/jwt';

// export async function verifyPassword(password, hash) {
//     const isMatch = await bcrypt.compare(password, hash)
//     return isMatch;
// }

// export async function POST(req: Request) {
//     try {
//         const body = await req.json();
//         const { email, password } = body;

//         if (!email || !password) {
//             const error = new Error("Please fill email and password") as Error & {
//                 status: number;
//             };
//             error.status = 400;
//             throw error;
//         }

//         const user = await prisma.users.findUnique({
//             where: {
//                 email,
//             },
//         });

//         if (!user) {
//             const error = new Error("User doesn't exist") as Error & {
//                 status: number;
//             };
//             error.status = 401;
//             throw error;
//         }

//         const hashPassword = user.password;

//         const verify = await verifyPassword(password, hashPassword);

//         if (!verify) {
//             const error = new Error("Please enter correct password") as Error & {
//                 status: number;
//             };
//             error.status = 401;
//             throw error;
//         }

//         // 3. Construct the safe payload (No password included)
//         const payload = {
//             id: user.id,
//             username: user.username,
//             email: user.email
//         };

//         // 4. Generate the JWT (maps to `new SignJWT(payload)`)
//         const token = await generateToken(payload);


//         return NextResponse.json(
//             {
//                 message: "Logged in successfully!",
//                 user: {
//                     userId: user.id,
//                     username: user.username,
//                     email: user.email,
//                     jwt: token
//                 },
//             },
//             {
//                 status: 201,
//             }
//         );
//     } catch (error) {
//         console.error(error);

//         const err = error as Error & { status?: number };

//         return NextResponse.json(
//             {
//                 error: err.message || "Internal Server Error",
//             },
//             {
//                 status: err.status || 500,
//             }
//         );
//     }
// }
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function GET() {
    const token = (await cookies()).get("jwt")?.value;

    if (!token) {
        return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    try {
        const { payload } = await jwtVerify(token, secret);
        return NextResponse.json(
            { valid: true, user: { id: payload.id, username: payload.username, email: payload.email } },
            { status: 200 }
        );
    } catch {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
}


// import { NextResponse } from 'next/server';
// import { jwtVerify } from 'jose';

// const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// export async function POST(req: Request) {
//     try {
//         const body = await req.json();
//         const { jwt } = body;

//         if (!jwt) {
//             const error = new Error("No token provided") as Error & {
//                 status: number;
//             };
//             error.status = 401;
//             throw error;
//         }

//         const { payload } = await jwtVerify(jwt, secret);

//         return NextResponse.json(
//             {
//                 valid: true,
//                 user: {
//                     id: payload.id,
//                     username: payload.username,
//                     email: payload.email,
//                 },
//             },
//             {
//                 status: 200,
//             }
//         );
//     } catch (error) {
//         console.error(error);

//         const err = error as Error & { status?: number };

//         return NextResponse.json(
//             {
//                 error: "Invalid or expired token",
//             },
//             {
//                 status: err.status || 401,
//             }
//         );
//     }
// }
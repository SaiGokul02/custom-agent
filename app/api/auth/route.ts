import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function hashPassword(passowrd: string) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(passowrd, salt);
    console.log("hash ", hash);
    return hash;
}

export async function verifyPassword(password, hash) {
    const isMatch = await bcrypt.compare(password, hash)
    return isMatch;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      const error = new Error("Please fill all the required details for registration") as Error & {
        status: number;
      };
      error.status = 400;
      throw error;
    }

    const existingUser = await prisma.users.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      const error = new Error("User already exists!") as Error & {
        status: number;
      };
      error.status = 409;
      throw error;
    }

    const hashedPassword = await hashPassword(password);

    const createdUser = await prisma.users.create({
      data: {
        username: name,
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      {
        message: "Registered successfully!",
        user: {
          name: createdUser.username,
          email: createdUser.email,
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
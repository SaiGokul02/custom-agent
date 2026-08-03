import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId, error } = await requireUserId();
  if (error) return error;

  const { threadId, role, content } = await req.json();

  try {
    const createMessage = await prisma.message.create({
      data: {
        threadId,
        role,
        content,
      },
    });

    return NextResponse.json(
      {
        sucess: true,
        message: "Created message successfully",
        threadId: createMessage.threadId,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
      },
    );
  }
}
